<?php

# Copyright (c) 2019 vonKrafft <contact@vonkrafft.fr>
# 
# This file is part of VulnDB.
# 
# This file may be used under the terms of the GNU General Public License
# version 3.0 as published by the Free Software Foundation and appearing in
# the file LICENSE included in the packaging of this file. Please review the
# following information to ensure the GNU General Public License version 3.0
# requirements will be met: http://www.gnu.org/copyleft/gpl.html.
# 
# This file is provided AS IS with NO WARRANTY OF ANY KIND, INCLUDING THE
# WARRANTY OF DESIGN, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.

# Prevent direct access
defined('ABSPATH') or die('Direct access is forbidden!');

/**
 * API class
 * @author vonKrafft <contact@vonkrafft.fr>
 */
class API
{
    /**
     * Property: method
     * The HTTP method this request was made in (GET, POST, PUT or DELETE)
     */
    protected $method = '';

    /**
     * Property: endpoint
     * The Model requested in the URI. eg: /<endpoint>
     */
    protected $endpoint = '';

    /**
     * Property: object_id
     * An optional additional object ID for the endpoint, used for things that
     * can not be handled by the basic methods
     * eg: /<endpoint>/<object_id>
     */
    protected $object_id = NULL;

    /**
     * Property: args
     * Any additional URI components after the endpoint and object ID have been
     * removed, in our case, an integer ID for the resource
     * eg: /<endpoint>/<object_id>/<arg0>/<arg1>
     */
    protected $args = array();

    /**
     * Property: request
     * Stores the input of the POST/GET request
     */
     protected $request = NULL;

    /**
     * Property: json
     * Stores the JSON data of the POST/PUT request
     */
     protected $json = NULL;

    /**
     * Constant: DATABASE_FILE
     * Absolute path of the file in which to store the database
     */
    const DATABASE_FILE = '/data/vulndb.json';

    /**
     * Property: database
     * An array to store the content of the database
     */
    private $database = array();

    /**
     * Property: is_edited
     * Edit control to write the database content into a file only if some
     * content has been edited
     */
    private $is_edited = false;

    /**
     * Constructor: __construct
     * Allow for CORS, assemble and pre-process the data and load database
     *
     * @param string $request_uri
     */
    function __construct(string $request_uri = '/')
    {
        header('Access-Control-Allow-Orgin: *');
        header('Access-Control-Allow-Methods: *');
        header('Content-Type: application/json');

        $this->method = $_SERVER['REQUEST_METHOD'];

        $this->args = explode('/', rtrim($request_uri, '/'));
        $this->endpoint = array_shift($this->args);
        $this->object_id = empty($this->args) ? NULL : array_shift($this->args);

        $this->_fetch_params();
        $this->_fetch_json();

        if (file_exists(self::DATABASE_FILE)) {
            $this->database = json_decode(file_get_contents(self::DATABASE_FILE), true);
            if ($this->database === NULL) {
                throw new Exception('Failed to load database: invalid JSON string (' . self::DATABASE_FILE . ')');
            }
        } else {
            throw new Exception('Failed to open stream: No such file or directory (' . self::DATABASE_FILE . ')');
        }
    }

    /**
     * Destructor: __destruct
     * Dump data into a JSON file
     */
    function __destruct()
    {
        if ($this->is_edited === true and is_array($this->database)) {
            file_put_contents(self::DATABASE_FILE, json_encode($this->database));
        }
    }

    /**
     * Method: process
     * Prepare data, process it and send response
     */
    public function process()
    {
        $handler = $this->endpoint . 'Handler';
        if (method_exists($this, $handler))
        {
            return $this->$handler($this->object_id, $this->args);
        }

        return $this->_response(array(
            'endpoint' => $this->endpoint,
        ), 501);
    }

    /**
     * Method: _response
     * Set HTTP response code and return data as JSON
     *
     * @param mixed[] $data
     * @param int $status_code (default: 200)
     * @return string
     */
    protected function _response(array $data, int $status_code = 200, int $options = 0) {
        header('HTTP/1.1 ' . $status_code . ' ' . $this->_reason($status_code));

        if ($status_code >= 300) {
            $data = array_merge(array(
                'code'  => $status_code, 
                'reason' => $this->_reason($status_code),
            ), $data);
        }

        return json_encode($data, $options);
    }

    /**
     * Method: _reason
     * Translate HTTP status code into a readable reason
     *
     * @param int $status_code
     * @return string
     */
    private function _reason(int $status_code) {
        switch ($status_code)
        {
            case 200: return 'OK';
            case 201: return 'Created';
            case 202: return 'Accepted';
            case 400: return 'Bad Request';
            case 401: return 'Invalid Credential';
            case 403: return 'Unauthorized';
            case 404: return 'Not Found';
            case 405: return 'Method Not Allowed';
            case 409: return 'Conflict';
            case 500: return 'Internal Server Error';
            case 501: return 'Not Implemented';
            default:  return '';
        }
    }

    /**
     * Method: _fetch_params
     * Fetch and sanitize GET and POST parameters
     */
    private function _fetch_params()
    {
        $this->request = array_map($this->_sanitize, array_merge($_GET, $_POST));
    }

    /**
     * Method: _fetch_json
     * Fetch and sanitize JSON data sent in the HTTP body
     */
    private function _fetch_json()
    {
        $this->json = array();

        if (array_key_exists('HTTP_CONTENT_TYPE', $_SERVER) and $_SERVER['HTTP_CONTENT_TYPE'] === 'application/json')
        {
            $this->json = json_decode(file_get_contents("php://input"), true);
            $this->json = (json_last_error() !== JSON_ERROR_NONE) ? array() : $this->json;
        }
    }

    /**
     * Method: _sanitize
     * Sanitize data
     *
     * @param mixed[]|mixed $data
     * @return mixed[]|mixed
     */
    private function _sanitize($data)
    {
        return is_array($data) ? array_map($this->_sanitize, $data) : trim(strip_tags($data));
    }

    /**
     * Method: _get_input
     * Getter for the fetched parameters
     *
     * @param string $key
     * @param mixed|NULL $default (default: NULL)
     * @return mixed|NULL
     */
    protected function _get_input(string $key, $default = NULL)
    {
        return array_key_exists($key, $this->request) ? $this->request[$key] : $default;
    }

    /**
     * Method: templateHandler
     * Endpoint handler for "template"
     *
     * GET     <API_URL>/template/      Retrieve all templates
     * GET     <API_URL>/template/:id   Retrieve a template by ID
     * POST    <API_URL>/template/      Create one or more template(s)
     * PUT     <API_URL>/template/:id   Edit a template by ID
     * DELETE  <API_URL>/template/:id   Delete a template by ID
     *
     * @param string|NULL $object_id (default: NULL)
     * @param mixed[] $args (default: array())
     * @return mixed[]
     */
    public function templateHandler(string $object_id = NULL, array $args = array())
    {
        switch (strtoupper($this->method)) {
            case 'HEAD':
            case 'GET':
                if ($object_id === NULL)
                {
                    return $this->_response(array_values($this->database), 200);
                }
                if (array_key_exists($object_id, $this->database))
                {
                    return $this->_response($this->database[$object_id], 200);
                }
                return $this->_response(array('error' => $object_id . ' does not exist!'), 404);

            case 'POST':
                if (array_keys($this->json) !== range(0, count($this->json) - 1))
                {
                    $object_id = bin2hex(random_bytes(10));
                    if (array_key_exists($object_id, $this->database))
                    {
                        return $this->_response(array('error' => 'Unable to create objects!'), 409);
                    }
                    $this->database[$object_id] = array_merge(array(
                        'id'              => $object_id,
                        'title'           => NULL,
                        'owasp'           => NULL,
                        'description'     => NULL,
                        'consequences'    => NULL,
                        'recommendations' => NULL,
                        'language'        => 'FR',
                    ), $this->json, array('id' => $object_id));
                    $this->is_edited = true;
                    return $this->_response($this->database[$object_id], 201);
                }
                else
                {
                    $objects_created = array();
                    foreach ($this->json as $index => $object)
                    {
                        $object_id = bin2hex(random_bytes(10));
                        if (array_key_exists($object_id, $this->database) or array_key_exists($object_id, $objects_created))
                        {
                            return $this->_response(array('error' => 'Unable to create objects!'), 409);
                        }
                        $objects_created[$object_id] = array_merge(array(
                            'id'              => $object_id,
                            'title'           => NULL,
                            'owasp'           => NULL,
                            'description'     => NULL,
                            'consequences'    => NULL,
                            'recommendations' => NULL,
                            'language'        => 'FR',
                        ), $object, array('id' => $object_id));
                    }
                    $this->database = array_merge($this->database, $objects_created);
                    $this->is_edited = true;
                    return $this->_response(array_values($objects_created), 201);
                }

            case 'PUT':
                if ($object_id === NULL)
                {
                    return $this->_response(array('error' => 'Object ID is required!'), 400);
                }
                if (array_key_exists($object_id, $this->database))
                {
                    $this->database[$object_id] = array_merge(array(
                        'id'              => $object_id,
                        'title'           => NULL,
                        'owasp'           => NULL,
                        'description'     => NULL,
                        'consequences'    => NULL,
                        'recommendations' => NULL,
                        'language'        => 'FR',
                    ), $this->database[$object_id], $this->json, array('id' => $object_id));
                    $this->is_edited = true;
                    return $this->_response($this->database[$object_id], 200);
                }
                return $this->_response(array('error' => $object_id . ' does not exist!'), 404);

            case 'DELETE':
                if ($object_id === NULL)
                {
                    return $this->_response(array('error' => 'Object ID is required!'), 400);
                }
                if (array_key_exists($object_id, $this->database))
                {
                    unset($this->database[$object_id]);
                    $this->is_edited = true;
                    return $this->_response(array(), 202);
                }
                return $this->_response(array('error' => $object_id . ' does not exist!'), 404);
            
            default:
                return $this->_response(array(
                    'error' => 'Allow methods: HEAD, GET, POST, PUT and DELETE',
                ), 405);
        }
    }

    /**
     * Method: exportHandler
     * Endpoint handler for "template"
     *
     * GET     <API_URL>/export/     Download all templates as JSON
     *
     * @param string|NULL $object_id (default: NULL)
     * @param mixed[] $args (default: array())
     * @return mixed[]
     */
    public function exportHandler(string $object_id = NULL, array $args = array())
    {
        switch (strtoupper($this->method)) {
            case 'HEAD':
            case 'GET':
                header('Content-disposition: attachment; filename=vulndb.json');
                return $this->_response(array_values($this->database), 200, JSON_PRETTY_PRINT);

            default:
                return $this->_response(array(
                    'error' => 'Allow methods: HEAD, GET, POST, PUT and DELETE',
                ), 405);
        }
    }
}

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

/**
 * VulnDB database class
 * @author vonKrafft <contact@vonkrafft.fr>
 */
class VulnDB
{
    /* Absolute path to store data */
    const DATABASE_FILE = '/data/vulndb.json';

    /* Database */
    private $database = NULL;

    /**
     * Construct
     * Load data from a JSON file
     */
    function __construct()
    {
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
     * Destruct
     * Dump data to a JSON file
     */
    function __destruct()
    {
        if (is_array($this->database)) {
            file_put_contents(self::DATABASE_FILE, json_encode($this->database));
        }
    }

    /**
     * Add data as an associative array
     *
     * @param mixed[]
     * @return int
     */
    public function load($import)
    {
        $imported_nb = 0;
        foreach ((array) $import as $id => $item) {
            $item = (array) $item;
            if ( ! array_key_exists('title', $item)) continue;
            $clean_item = array(
                'title'           => array_key_exists('title', $item)           ? $item['title']           : NULL,
                'owasp'           => array_key_exists('owasp', $item)           ? $item['owasp']           : NULL,
                'description'     => array_key_exists('description', $item)     ? $item['description']     : NULL,
                'consequences'    => array_key_exists('consequences', $item)    ? $item['consequences']    : NULL,
                'recommendations' => array_key_exists('recommendations', $item) ? $item['recommendations'] : NULL,
                'language'        => array_key_exists('language', $item)        ? $item['language']        : 'FR',
            );
            if (array_key_exists($id, $this->database)) {
                $this->database[$id] = array_merge($this->database[$id], $clean_item);
            } else {
                $this->database[$id] = $clean_item;
            }
            $imported_nb++;
        }
        return $imported_nb;
    }

    /**
     * Get data as an associative array
     *
     * @return mixed[]
     */
    public function dump()
    {
        return is_array($this->database) ? $this->database : array();
    }

    /**
     * Find items from database
     *
     * @param string
     * @param mixed[]
     * @return mixed[]
     */
    public function find($language, $search_terms = array())
    {
        $hits = array();
        $max_score = 0.0;
        foreach ($this->database as $id => $data) {
            if ($data['language'] === $language) {
                if (empty($search_terms)) {
                    $data['score'] = 1.0;
                    $hits[$id] = $data;
                } else {
                    $data['score'] = 0.0;
                    foreach ((array) $search_terms as $key => $term) {
                        $value = array_key_exists($key, $data) ? strval($data[$key]) : '';
                        $score = floatval(substr_count(strtolower($value), strtolower($term)));
                        $data['score'] += strlen($value) !== 0 ? ($score * strlen($term)) / strlen($value) : 0.0;
                    }
                    if ($data['score'] != 0.0) $hits[$id] = $data;
                }
                $max_score = max($max_score, $data['score']);
            }
        }
        uasort($hits, function ($a, $b) {
            if ($a['score'] === $b['score']) {
                $owasp_cmp = strcmp($a['owasp'], $b['owasp']);
                return ($owasp_cmp == 0) ? strcmp($a['title'], $b['title']) : $owasp_cmp;
            }
            return ($a['score'] < $b['score']) ? -1 : 1;
        });
        return array(
            'total'     => count($this->database),
            'matches'   => count($hits),
            'max_score' => floatval($max_score),
            'time'      => microtime(true) - $_SERVER["REQUEST_TIME_FLOAT"],
            'filesize'  => sprintf('%.2f KB', floatval(filesize(self::DATABASE_FILE)) / 1024.0),
            'hits'      => $hits
        );
    }

    /**
     * Select an item from database
     *
     * @param string
     * @return mixed[]|NULL
     */
    public function select($id)
    {
        if (is_array($this->database) and array_key_exists($id, $this->database)) {
            return $this->database[$id];
        }
        return NULL;
    }

    /**
     * Insert a new item in database
     *
     * @param string
     * @param mixed[]
     * @return string|false
     */
    public function insert($id, $source)
    {
        if (($id === NULL) or empty($id)) {
            $id = bin2hex(random_bytes(10));
        } elseif (array_key_exists($id, $this->database)) {
            return false;
        }
        $this->database[$id] = array_merge(array(
            'title'           => NULL,
            'owasp'           => NULL,
            'description'     => NULL,
            'consequences'    => NULL,
            'recommendations' => NULL,
            'language'        => 'FR',
        ), is_array($source) ? $source : array());
        return $id;
    }

    /**
     * Update an item in database
     *
     * @param string
     * @param mixed[]
     * @return string|false
     */
    public function update($id, $source)
    {
        if (array_key_exists($id, $this->database)) {
            $this->database[$id] = array_merge($this->database[$id], $source);
            return $id;
        }
        return false;
    }

    /**
     * Delete an item from database
     *
     * @param string
     * @return string|false
     */
    public function delete($id)
    {
        if (array_key_exists($id, $this->database)) {
            unset($this->database[$id]);
            return $id;
        }
        return false;
    }

    /**
     * Get statistics from database
     *
     * @return mixed[]
     */
    public function stats() {
        $stats = array(
            'total'    => count($this->database),
            'filesize' => sprintf('%.2f KB', floatval(filesize(self::DATABASE_FILE)) / 1024.0),
            'stats'    => array(),
        );
        foreach($this->database as $id => $item) {
            $language = array_key_exists('language', $item) ? strtoupper($item['language']) : NULL;
            $owasp = array_key_exists('owasp', $item) ? $item['owasp'] : NULL;
            if (isset($language, $owasp) and ! empty($language) and ! empty($owasp)) {
                if ( ! array_key_exists($owasp, $stats['stats'])) {
                    $stats['stats'][$owasp] = array('FR' => 0, 'EN' => 0);
                }
                $stats['stats'][$owasp][$language] = array_key_exists($language, $stats['stats'][$owasp]) ? intval($stats['stats'][$owasp][$language])+1 : 1;
            }
        }
        return $stats;
    }
}

try {

    $id = array_key_exists('PATH_INFO', $_SERVER) ? preg_replace('/^\/?([^\/]*)\/?.*/', '$1', $_SERVER['PATH_INFO']) : '';
    $db = new VulnDB();

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'HEAD':
            if (! empty($id) and ($id !== '_search') and ($db->select($id) === NULL)) {
                header('HTTP/1.1 404 Not Found', true, 404);
            }
            exit();

        case 'GET':
            if ($id === '_search') {
                header('HTTP/1.1 405 Method Not Allowed', true, 405);
                header('Content-Type: application/json');
                echo json_encode(array('code' => 405, 'error' => 'incorrect HTTP method'));
            } elseif ($id === '_import') {
                header('HTTP/1.1 405 Method Not Allowed', true, 405);
                header('Content-Type: application/json');
                echo json_encode(array('code' => 405, 'error' => 'incorrect HTTP method'));
            } elseif ($id === '_export') {
                header('Content-disposition: attachment; filename=vulndb.json');
                header('Content-Type: application/json');
                echo json_encode($db->dump(), JSON_PRETTY_PRINT);
            } elseif ($id === '_stats') {
                header('Content-Type: application/json');
                echo json_encode($db->stats());
            } elseif (($item = $db->select($id)) !== NULL) {
                header('Content-Type: application/json');
                echo json_encode($item);
            } else {
                header('HTTP/1.1 404 Not Found', true, 404);
                header('Content-Type: application/json');
                echo json_encode(array('code' => 404, 'id' => $id, 'found' => false));
            }
            exit();

        case 'POST':
            if (array_key_exists('HTTP_CONTENT_TYPE', $_SERVER) and $_SERVER['HTTP_CONTENT_TYPE'] === 'application/json') {
                $_POST = json_decode(file_get_contents("php://input"), true);
                $_POST = (json_last_error() !== JSON_ERROR_NONE) ? array() : $_POST;
            }
            if ($id === '_search') {
                $language = array_key_exists('language', $_POST) ? strval($_POST['language']) : '';
                $search_terms = array_key_exists('search_terms', $_POST) ? (array) $_POST['search_terms'] : array();
                $results = $db->find($language, $search_terms);
                header('Content-Type: application/json');
                echo json_encode($results);
            } elseif ($id === '_import') {
                $imported_nb = $db->load($_POST);
                header('Content-Type: application/json');
                echo json_encode(array('items' => $imported_nb, 'result' => 'imported'));
            } elseif ($id === '_export') {
                header('HTTP/1.1 405 Method Not Allowed', true, 405);
                header('Content-Type: application/json');
                echo json_encode(array('code' => 405, 'error' => 'incorrect HTTP method'));
            } elseif ($id === '_stats') {
                header('HTTP/1.1 405 Method Not Allowed', true, 405);
                header('Content-Type: application/json');
                echo json_encode(array('code' => 405, 'error' => 'incorrect HTTP method'));
            } elseif (empty($id) or ($db->select($id) === NULL)) {
                if (($created_id = $db->insert($id, $_POST)) !== false) {
                    header('HTTP/1.1 201 Created', true, 201);
                    header('Content-Type: application/json');
                    echo json_encode(array('id' => $created_id, 'result' => 'created'));
                    exit();
                } else {
                    header('HTTP/1.1 400 Bad Request', true, 400);
                    header('Content-Type: application/json');
                    echo json_encode(array('code' => 400, 'error' => 'not created'));
                    exit();
                }
            } else {
                $updated_id = $db->update($id, $_POST);
                header('Content-Type: application/json');
                echo json_encode(array('id' => $updated_id, 'result' => 'updated'));
            }
            exit();

        case 'DELETE':
            if ($id === '_search') {
                header('HTTP/1.1 405 Method Not Allowed', true, 405);
                header('Content-Type: application/json');
                echo json_encode(array('code' => 405, 'error' => 'incorrect HTTP method'));
                exit();
            } elseif ($id === '_import') {
                $imported_nb = $db->load($_POST);
                header('Content-Type: application/json');
                echo json_encode(array('items' => $imported_nb, 'result' => 'imported'));
            } elseif ($id === '_export') {
                header('HTTP/1.1 405 Method Not Allowed', true, 405);
                header('Content-Type: application/json');
                echo json_encode(array('code' => 405, 'error' => 'incorrect HTTP method'));
            } elseif ($id === '_stats') {
                header('HTTP/1.1 405 Method Not Allowed', true, 405);
                header('Content-Type: application/json');
                echo json_encode(array('code' => 405, 'error' => 'incorrect HTTP method'));
            } elseif (($deleted_id = $db->delete($id)) !== false) {
                header('Content-Type: application/json');
                echo json_encode(array('id' => $deleted_id, 'result' => 'deleted'));
            } else {
                header('HTTP/1.1 404 Not Found', true, 404);
                header('Content-Type: application/json');
                echo json_encode(array('code' => 404, 'id' => $id, 'found' => false));
            }
            exit();

        default:
            header('HTTP/1.1 405 Method Not Allowed', true, 405);
            header('Content-Type: application/json');
            echo json_encode(array('code' => 405, 'error' => 'incorrect HTTP method'));
            exit();
    }

} catch (Exception $e) {
    header('HTTP/1.1 500 Internal Server Error', true, 500);
    header('Content-Type: application/json');
    echo json_encode(array('code' => 500, 'error' => $e->getMessage()));
    exit();
}


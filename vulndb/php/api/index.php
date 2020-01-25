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

define('ABSPATH', dirname(__FILE__));

require_once ABSPATH . '/API.inc.php';

$api = new API(array_key_exists('PATH_INFO', $_SERVER) ? $_SERVER['PATH_INFO'] : $_SERVER['REQUEST_URI']);
echo $api->process();

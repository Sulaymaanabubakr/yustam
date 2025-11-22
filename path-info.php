<?php
/**
 * Simple helper to reveal the absolute path of this directory on the server.
 * Upload to the same location you want to inspect and visit it in a browser
 * (remember to delete it afterwards).
 */
$dirRaw = __DIR__;
$real = realpath(__DIR__);
$cwd = getcwd();
header('Content-Type: text/plain');
echo "__DIR__      : {$dirRaw}\n";
echo "realpath     : {$real}\n";
echo "getcwd()     : {$cwd}\n";
?>

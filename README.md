# VulnDB Docker

**VulnDB** is a simple PHP application to manage templates for pentest reports.

![Web interface of VulnDB](https://raw.githubusercontent.com/vonKrafft/VulnDB-Docker/master/preview.png)

Create templates with a title, an OWASP category and a description with consequences and recommendations, and copy it when you have to in your pentest report.

Data are stored in a single JSON file. You can export it when you want through the Web interface.

This **VulnDB** repository is design to work with [Docker](https://www.docker.com/), but you can also host it on your server using the configuration file `nginx.conf` to help you.

## Installation

You have to install `docker` and `docker-compose` (https://docs.docker.com/compose/install/).

```
$ git clone https://github.com/vonKrafft/VulnDB-Docker
$ cd VulnDB-Docker
$ chmod a+rw web-vulndb/log/{access,error}.log web-vulndb/data/vulndb.json 
$ docker-compose up -d
```

## Dependencies

**Docker**

- Nginx:stable-alpine - Docker Official Images (https://hub.docker.com/_/nginx)
- PHP:fpm-alpine - Docker Official Images (https://hub.docker.com/_/php)

**Web interface**

- Bootstrap v4.1.3 (https://getbootstrap.com/)
- Font Awesome Free 5.3.1 by @fontawesome (https://fontawesome.com)
- jQuery v3.3.1 (https://jquery.org/)
- Popper v1.14.3 (https://popper.js.org/)
- showdown v1.8.6 (https://github.com/showdownjs/showdown)

## License

This source code may be used under the terms of the GNU General Public License version 3.0 as published by the Free Software Foundation and appearing in the file LICENSE included in the packaging of this file. Please review the following information to ensure the GNU General Public License version 3.0 requirements will be met: http://www.gnu.org/copyleft/gpl.html.
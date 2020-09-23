# VulnDB Docker

**VulnDB** is a simple JavaScript application to manage templates for pentest reports. It runs with [NodeJS](https://nodejs.org/en/) and uses [ReactJS](https://reactjs.org/), [Express](http://expressjs.com/), [Lodash](https://lodash.com/), [Recharts](https://recharts.org/), and [SemanticUI](https://react.semantic-ui.com/) among others.

![Web interface of VulnDB](https://raw.githubusercontent.com/vonKrafft/VulnDB-Docker/master/preview.png)

Create templates with a title, an OWASP category and a description with consequences and recommendations, and copy it when you have to in your pentest report:

- By design, **VulnDB** allow to create templates written in English and French.
- The templates are organized by OWASP category and sorted alphabetically.
- If the title of the template matches the OWASP label, it will be displayed first in the list and highlighted in light blue.
- A search form is used to dynamically filter the list of templates displayed on the page.
- The URL is automatically rewritten to share searches or a link to a particular template.
- Data are stored in a single JSON file. You can export it when you want through the Web interface.

This **VulnDB** repository is design to work with [Docker](https://www.docker.com/), but you can also host it on your server using the configuration file `nginx.conf` to help you.

## Installation

You have to install `docker` and `docker-compose` (https://docs.docker.com/compose/install/).

```
$ git clone https://github.com/vonKrafft/VulnDB-Docker
$ cd VulnDB-Docker
$ docker-compose up -d --build
```

You can also run **VulnDB** without Docker, provided you have _NodeJS_ installed:

```
$ npm install && npm run build
$ node vulndb.js
```

## License

This source code may be used under the terms of the GNU General Public License version 3.0 as published by the Free Software Foundation and appearing in the file LICENSE included in the packaging of this file. Please review the following information to ensure the GNU General Public License version 3.0 requirements will be met: http://www.gnu.org/copyleft/gpl.html.
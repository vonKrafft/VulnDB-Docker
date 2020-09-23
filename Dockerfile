# Copyright (c) 2020 vonKrafft <contact@vonkrafft.fr>
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

FROM node:alpine

RUN mkdir -p /home/node/app/node_modules \
    && chown -R node:node /home/node/app

USER node
WORKDIR /home/node/app

COPY --chown=node:node src ./src/
COPY --chown=node:node public ./public/
COPY --chown=node:node package*.json yarn.lock vulndb.js ./
COPY --chown=node:node vulndb-sample.json vulndb.json

RUN npm install && npm run build

EXPOSE 5000

CMD [ "node", "vulndb.js" ]

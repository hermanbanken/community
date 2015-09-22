# Community financial system

Track spenditure from a group of people. Inspired by WieBetaaltWat.nl, created for H.I.C. Octopus.

## Installation

Make sure to have Mongo, npm, node, nodemon, Google Client ID and secret (for OAuth/OpenID).

- [ ] install mongo, however you like
- [ ] install node + npm, however you like
- [ ] register at console.developers.google.com to get OAuth 2.0 client IDs
- [ ] `install nodemon`
- [ ] checkout git repository
- [ ] npm install
- [ ] see either `local development` or `startup on server`

## Package versions

Since a few commits the version of packages is locked down. This is to prevent un intended updates and ensures tested behaviour. For more info on how to update dependencies see [https://www.npmjs.com/package/lockdown](https://www.npmjs.com/package/lockdown).

## Local development

To easily develop locally, add the environment variables to your shell. Execute a command like the following, taking care to replace the variables.

```
GOOGLE_CLIENTID="<identifier>.apps.googleusercontent.com" \
GOOGLE_SECRET="<secret>" \
HOSTNAME=localhost \
PORT=3000 \
MONGO_URI=mongodb://localhost/<nameofcollection> \
nodemon app.js
```
The trailing slashes are optional, but allow me to split this command over multiple lines for your readability. Having them on your bash history is annoying, so I recommend removing the trailing slashes first.

## Startup on server

To create a `forever` running server, you can use a install script like the one below. Adjust your parameters to suit your system. Move the script to the `/etc/init.d` folder.

```
### BEGIN INIT INFO
# Provides:          community
# Required-Start:    $local_fs $network
# Required-Stop:     $local_fs
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Community
# Description:       Community daemon
### END INIT INFO

#! /bin/sh
# /etc/init.d/nsmag
#

NAME=Community
APPDIR=/var/www/community
APP=$APPDIR/app.js
forever=/usr/local/bin/forever
export PATH=$PATH:/usr/local/bin/
LOG=/var/log/community.log

GOOGLE_CLIENTID="veryl0ng-ident1f1erc0ntainingnumb0rs.apps.googleusercontent.com"
GOOGLE_SECRET="m7ch_S3crets"
HOSTNAME=localhost
PORT=3000
MONGO_URI=mongodb://localhost/community

case "$1" in
  start)
    echo "Starting $NAME"
    cd $APPDIR
    GOOGLE_CLIENTID=$GOOGLE_CLIENTID GOOGLE_SECRET=$GOOGLE_SECRET HOSTNAME=$HOSTNAME PORT=$PORT MONGO_URI=$MONGO_URI $forever --minUptime 5000 --spinSleepTime 2000 -a -l $LOG start $APP
    ;;
  stop)
    echo "Stopping script $NAME"
    $forever stop $APP
    ;;
  list)
    echo "List"
    $forever list
    ;;
  *)
    echo "Usage: /etc/init.d/community {start|stop|list}"
    exit 1
    ;;
esac

exit 0
```

Now start and stop your server using:

```
/etc/init.d/community start
```
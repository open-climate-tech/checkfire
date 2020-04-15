# first start UI backend server
NODE_ENV=development node server-main.js &
# then start react UI client
# REACT_APP_BE_PORT=5000 node_modules/react-scripts/bin/react-scripts.js start
REACT_APP_BE_PORT=5000 npx react-scripts start

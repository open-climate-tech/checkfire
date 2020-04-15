# first test UI with jest (CI=true avoids continuous watch)
CI=true npx react-scripts test
# next test UI backend with mocha
CI=true mocha server-src/test

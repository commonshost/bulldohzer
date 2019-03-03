#!/usr/bin/env node

const pkg = require('../package.json')
require('please-upgrade-node')(pkg)
require('./cli.js')

const pg = require('pg')
const AWS = require('aws-sdk')
const fs = require('fs')
const path = require('path')

const secrets = new AWS.SecretsManager({})

exports.handler = async (e) => {
  try {
    const { config } = e.params
    const { password, username, host } = await getSecretValue(config.credsSecretName)
    const pool = pg.Pool({
      host: host,
      user: username,
      password: password,
    })

    const sqlScript = fs.readFileSync(path.join(__dirname, 'script.sql')).toString()
    const res = await query(pool, sqlScript)

    return {
      status: 'OK',
      results: res
    }
  } catch (err) {
    return {
      status: 'ERROR',
      err,
      message: err.message
    }
  }
}

function query (pool, sql) {
  return new Promise((resolve, reject) => {
    pool.query(sql, (error, res) => {
      if (error) return reject(error)

      return resolve(res)
    })
  })
}

function getSecretValue (secretId) {
  return new Promise((resolve, reject) => {
    secrets.getSecretValue({ SecretId: secretId }, (err, data) => {
      if (err) return reject(err)

      return resolve(JSON.parse(data.SecretString))
    })
  })
}
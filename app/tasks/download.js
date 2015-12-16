'use strict'

let Transition = require('./errors').Transition

let log = require('../util/log')('tasks/download')
let http = require('../util/http')
let noop = require('../util/noop')

let CaveStore = require('../stores/cave-store')
let CredentialsStore = require('../stores/credentials-store')

function ensure (predicate, reason) {
  if (!predicate) {
    throw new Transition({
      to: 'find-upload',
      reason
    })
  }
}

async function start (opts) {
  let id = opts.id
  let onprogress = opts.onprogress || noop
  let logger = opts.logger

  let cave = await CaveStore.find(id)

  ensure(cave.upload_id, 'need upload id')
  ensure(cave.uploads, 'need cached uploads')

  let upload = cave.uploads[cave.upload_id]
  ensure(upload, 'need upload in upload cache')

  // Get download URL
  let client = CredentialsStore.get_current_user()
  let url = (await (cave.key
    ? client.download_upload_with_key(cave.key.id, cave.upload_id)
    : client.download_upload(cave.upload_id)
  )).url

  let parsed = require('url').parse(url)
  log(opts, `d/l from ${parsed.hostname}`)

  await http.request({
    url, onprogress, logger,
    dest: CaveStore.archive_path(upload)
  })
}

module.exports = { start }

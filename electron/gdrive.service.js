const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')
const { app, shell } = require('electron')
const http = require('http')
const url = require('url')

function getTokenPath() {
  return path.join(app.getPath('userData'), 'gdrive_token.json')
}
const REDIRECT_URI = 'http://localhost:42831/oauth2callback'

function getOAuth2Client() {
  const clientId = process.env.GDRIVE_CLIENT_ID
  const clientSecret = process.env.GDRIVE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET must be set in .env')
  }
  return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)
}

function loadSavedToken(client) {
  const tokenPath = getTokenPath()
  if (fs.existsSync(tokenPath)) {
    try {
      const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'))
      client.setCredentials(token)
      return true
    } catch { return false }
  }
  return false
}

module.exports = {
  getAuthUrl: async () => {
    const client = getOAuth2Client()
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/userinfo.email']
    })
  },

  startAuthServer: (authUrl) => {
    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        try {
          if (req.url.startsWith('/oauth2callback')) {
            const qs = new url.URL(req.url, 'http://localhost:42831').searchParams
            const code = qs.get('code')
            if (code) {
              res.end('<h1>Authentication successful!</h1><p>You can close this tab and return to FloriManager.</p>')
              const client = getOAuth2Client()
              const { tokens } = await client.getToken(code)
              fs.writeFileSync(getTokenPath(), JSON.stringify(tokens))
              client.setCredentials(tokens)
              server.close()
              resolve()
            } else {
              res.end('<h1>Authentication failed!</h1><p>No code returned.</p>')
              server.close()
              reject(new Error('No code returned'))
            }
          }
        } catch (e) {
          res.end('<h1>Authentication error</h1><p>' + e.message + '</p>')
          server.close()
          reject(e)
        }
      })

      const timeout = setTimeout(() => {
        server.close()
        reject(new Error('Authentication timed out after 5 minutes'))
      }, 5 * 60 * 1000)

      server.listen(42831, '127.0.0.1', () => {
        shell.openExternal(authUrl).catch(e => {
          clearTimeout(timeout)
          server.close()
          reject(new Error('Could not open browser: ' + e.message))
        })
      })
    })
  },

  disconnect: async () => {
    const tokenPath = getTokenPath()
    if (fs.existsSync(tokenPath)) fs.unlinkSync(tokenPath)
  },

  getStatus: async () => {
    try {
      const client = getOAuth2Client()
      if (!loadSavedToken(client)) return { connected: false }
      const oauth2 = google.oauth2({ version: 'v2', auth: client })
      const drive = google.drive({ version: 'v3', auth: client })
      
      const [userInfo, about] = await Promise.all([
        oauth2.userinfo.get(),
        drive.about.get({ fields: 'storageQuota' })
      ])
      
      return {
        connected: true,
        email: userInfo.data.email,
        storageUsed: parseInt(about.data.storageQuota.usage || '0'),
        storageTotal: parseInt(about.data.storageQuota.limit || '0')
      }
    } catch (e) {
      return { connected: false }
    }
  },

  isAuthenticated: () => fs.existsSync(getTokenPath()),

  uploadFile: async (filePath, originalName) => {
    const client = getOAuth2Client()
    if (!loadSavedToken(client)) throw new Error('Not authenticated')
    
    const drive = google.drive({ version: 'v3', auth: client })
    
    // Check if FloriManager folder exists
    let folderId = null
    const res = await drive.files.list({
      q: "name='FloriManager Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      spaces: 'drive',
      fields: 'files(id)'
    })
    
    if (res.data.files.length > 0) {
      folderId = res.data.files[0].id
    } else {
      const folder = await drive.files.create({
        resource: { name: 'FloriManager Backups', mimeType: 'application/vnd.google-apps.folder' },
        fields: 'id'
      })
      folderId = folder.data.id
    }
    
    // Upload file
    const fileSize = fs.statSync(filePath).size
    const fileName = path.basename(filePath)
    
    const media = {
      mimeType: 'application/x-sqlite3',
      body: fs.createReadStream(filePath)
    }
    
    const file = await drive.files.create({
      resource: { name: fileName, parents: [folderId] },
      media: media,
      fields: 'id'
    }, {
      onUploadProgress: evt => {
        // We could emit progress here to the main window if needed
        const win = require('electron').BrowserWindow.getAllWindows()[0]
        if (win) win.webContents.send('gdrive:upload:progress', { done: evt.bytesRead, total: fileSize })
      }
    })
    
    return file.data.id
  }
}

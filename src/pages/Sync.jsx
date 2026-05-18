import { useEffect, useRef, useState } from 'react'
import { RefreshCw, HardDrive, FolderOpen, Upload, CheckCircle, XCircle, Clock, AlertTriangle, Database } from 'lucide-react'
import { C } from '../utils/pageStyles'

const AUTO_KEY   = 'auto_backup_cfg'
const SERVER_KEY = 'sync_server_cfg'
const TABS = ['Local Backup', 'Auto Backup', 'Restore', 'Backup History']

export default function Sync() {
  const [syncStatus, setSyncStatus] = useState({ pending: 0, failed: 0, synced: 0 })
  const [syncing,    setSyncing]    = useState(false)
  const [pulling,    setPulling]    = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [tab,        setTab]        = useState(0)
  const [backups,    setBackups]    = useState([])
  const [backing,    setBacking]    = useState(false)
  const [backupMsg,  setBackupMsg]  = useState('')
  const [restoring,  setRestoring]  = useState(false)
  const [restoreMsg, setRestoreMsg] = useState('')
  const [autoEnabled, setAutoEnabled] = useState(() => JSON.parse(localStorage.getItem(AUTO_KEY) || '{"enabled":false}').enabled)
  const [autoTime,    setAutoTime]    = useState(() => JSON.parse(localStorage.getItem(AUTO_KEY) || '{"time":"02:00"}').time || '02:00')
  const [autoMsg,     setAutoMsg]     = useState('')
  const [apiUrl,      setApiUrl]      = useState(() => JSON.parse(localStorage.getItem(SERVER_KEY) || '{"url":""}').url || '')
  const [apiToken,    setApiToken]    = useState(() => JSON.parse(localStorage.getItem(SERVER_KEY) || '{"token":""}').token || '')
  const [serverMsg,   setServerMsg]   = useState('')

  const timerRef     = useRef(null)
  const autoTimerRef = useRef(null)

  const loadStatus  = () => window.api.sync.status().then(setSyncStatus).catch(() => {})
  const loadBackups = () => window.api.backup.getAll().then(setBackups).catch(() => {})

  useEffect(() => {
    loadStatus()
    loadBackups()
    if (localStorage.getItem('db_restored_msg')) {
      localStorage.removeItem('db_restored_msg')
      setRestoreMsg('✔ Database restored successfully! Please restart the app.')
      timerRef.current = setTimeout(() => setRestoreMsg(''), 30000)
    }
  }, [])

  useEffect(() => {
    clearInterval(autoTimerRef.current)
    if (!autoEnabled) return
    const check = () => {
      const now = new Date()
      const [h, m] = autoTime.split(':').map(Number)
      if (now.getHours() === h && now.getMinutes() === m) {
        const key = `${now.toDateString()}_${autoTime}`
        if (localStorage.getItem('auto_backup_last') !== key) {
          localStorage.setItem('auto_backup_last', key)
          window.api.backup.create()
            .then(res => { setAutoMsg(`✔ Auto backup saved - ${res.size_kb} KB`); loadBackups() })
            .catch(() => setAutoMsg('✖ Auto backup failed'))
        }
      }
    }
    check()
    autoTimerRef.current = setInterval(check, 60000)
    return () => clearInterval(autoTimerRef.current)
  }, [autoEnabled, autoTime])

  const saveAutoConfig = async () => {
    const cfg = { enabled: autoEnabled, time: autoTime }
    localStorage.setItem(AUTO_KEY, JSON.stringify(cfg))
    try {
      await window.api.autobackup.save(cfg)
      setAutoMsg(`✔ Auto backup ${autoEnabled ? `enabled at ${autoTime}` : 'disabled'}`)
    } catch (e) {
      setAutoMsg(`✖ Save failed: ${e.message}`)
    }
    setTimeout(() => setAutoMsg(''), 4000)
  }

  const saveServerConfig = () => {
    localStorage.setItem(SERVER_KEY, JSON.stringify({ url: apiUrl, token: apiToken }))
    setServerMsg('✔ Server configuration saved')
    setTimeout(() => setServerMsg(''), 3000)
  }

  const handleSync = async () => {
    const url   = apiUrl.trim()
    const token = apiToken.trim()
    if (!url) return setSyncResult({ skipped: true })
    setSyncing(true); setSyncResult(null)
    try { const res = await window.api.sync.run(url, token); setSyncResult(res); loadStatus() }
    catch (e) {
      const msg = e.message || ''
      const friendly = msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('timed out')
        ? 'Cannot connect to server. Make sure the server is running at ' + url
        : msg
      setSyncResult({ error: friendly })
    }
    setSyncing(false)
  }

  const handleFullSync = async () => {
    if (!confirm('Sab existing SQLite data MySQL mein sync hoga. Continue?')) return
    setSyncing(true); setSyncResult(null)
    try {
      const { total } = await window.api.sync.fullSync()
      const res = await window.api.sync.run()
      setSyncResult({ ...res, fullSync: true, total })
      loadStatus()
    } catch (e) { setSyncResult({ error: e.message }) }
    setSyncing(false)
  }

  const handlePullAll = async () => {
    const url   = apiUrl.trim()
    const token = apiToken.trim()
    if (!url) return setSyncResult({ error: 'Server URL set karo pehle.' })
    if (!confirm('Server se sab data pull hoga aur local data update ho jayega. Continue?')) return
    setPulling(true); setSyncResult(null)
    try {
      const res = await window.api.sync.pullAll(url, token)
      setSyncResult({ pulled: res.pulled, pullOnly: true })
      loadStatus()
    } catch (e) {
      const msg = e.message || ''
      setSyncResult({ error: msg.includes('fetch failed') || msg.includes('ECONNREFUSED') ? 'Cannot connect to server. Make sure server is running at ' + url : msg })
    }
    setPulling(false)
  }

  const handleResetFailed = async () => { await window.api.sync.resetFailed(); loadStatus() }

  const handleBackup = async () => {
    setBacking(true); setBackupMsg('')
    try {
      const res = await window.api.backup.create()
      setBackupMsg(`✔ Saved to Local & Google Drive - ${res.size_kb} KB`)
      loadBackups()
    } catch (e) { setBackupMsg(`✖ Backup failed: ${e.message}`) }
    setBacking(false)
  }

  const handleRestore = async () => {
    if (!confirm('Restore from backup? Current data will be replaced.')) return
    setRestoring(true); setRestoreMsg(''); clearTimeout(timerRef.current)
    try {
      const res = await window.api.backup.restore()
      if (res.cancelled) {
        setRestoreMsg('Restore cancelled.')
      } else if (res.success) {
        setRestoreMsg('✔ Restored! App is restarting...')
      } else {
        setRestoreMsg(`✖ Restore failed: ${res.error || 'Unknown error'}`)
      }
    } catch (e) { setRestoreMsg(`✖ Restore failed: ${e.message}`) }
    setRestoring(false)
    timerRef.current = setTimeout(() => setRestoreMsg(''), 30000)
  }

  const total = syncStatus.pending + syncStatus.failed + syncStatus.synced
  const statusCards = [
    { label: 'Pending', value: syncStatus.pending, icon: Clock,       bg: '#fffbeb', color: '#d97706' },
    { label: 'Failed',  value: syncStatus.failed,  icon: XCircle,     bg: '#fef2f2', color: '#dc2626' },
    { label: 'Synced',  value: syncStatus.synced,  icon: CheckCircle, bg: '#ecfdf5', color: '#059669' },
  ]

  const Msg = ({ msg, onClose }) => msg ? (
    <div style={{ background: msg.startsWith('✔') ? '#ecfdf5' : msg.startsWith('✖') ? '#fef2f2' : '#f8fafc', border: `1px solid ${msg.startsWith('✔') ? '#bbf7d0' : msg.startsWith('✖') ? '#fecaca' : '#e2e8f0'}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: msg.startsWith('✔') ? '#059669' : msg.startsWith('✖') ? '#dc2626' : '#64748b', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span>{msg}</span>
      {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1, color: 'inherit', opacity: 0.6 }}>×</button>}
    </div>
  ) : null

  return (
    <div style={C.page}>
      <div>
        <h2 style={C.title}>Sync & Backup</h2>
        <p style={C.subtitle}>Local-first sync and automated backup management</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* â”€â”€ Left: Cloud Sync â”€â”€ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Cloud Sync</p>

          {/* Status Cards - compact row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {statusCards.map(({ label, value, icon: Icon, bg, color }) => (
              <div key={label} style={{ background: bg, borderRadius: 10, padding: '10px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon size={16} color={color} style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 18, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {total > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#475569' }}>Sync Progress</span>
                <span style={{ fontSize: 11, color: '#475569' }}>{syncStatus.synced}/{total}</span>
              </div>
              <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#00deab', borderRadius: 99, width: `${(syncStatus.synced / total) * 100}%`, transition: 'width 0.4s' }} />
              </div>
            </div>
          )}

          {/* Server Config - compact */}
          <div style={C.cardP}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Server Configuration</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ ...C.label, whiteSpace: 'nowrap', width: 70, margin: 0 }}>API URL</label>
                <input style={{ ...C.input, flex: 1 }} placeholder="http://localhost:3001/api" value={apiUrl} onChange={e => setApiUrl(e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ ...C.label, whiteSpace: 'nowrap', width: 70, margin: 0 }}>Token</label>
                <input type="password" style={{ ...C.input, flex: 1 }} placeholder="Bearer token..." value={apiToken} onChange={e => setApiToken(e.target.value)} />
              </div>
              {serverMsg && <div style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#059669' }}>{serverMsg}</div>}
              <button style={{ ...C.btn, justifyContent: 'center' }} onClick={saveServerConfig}>Save</button>
            </div>
          </div>

          {/* Sync result */}
          {syncResult && (
            <div style={{ background: syncResult.error ? '#fef2f2' : syncResult.skipped ? '#f8fafc' : '#ecfdf5', border: `1px solid ${syncResult.error ? '#fecaca' : syncResult.skipped ? '#e2e8f0' : '#bbf7d0'}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: syncResult.error ? '#dc2626' : syncResult.skipped ? '#64748b' : '#059669' }}>
              {syncResult.error ? `✖ ${syncResult.error}` : syncResult.skipped ? 'ℹ No server configured - offline mode.' : syncResult.pullOnly ? `✔ Pulled ${syncResult.pulled} records from server` : syncResult.fullSync ? `✔ Full Sync - ${syncResult.synced} synced` : `✔ Synced ${syncResult.synced} record${syncResult.synced !== 1 ? 's' : ''}${syncResult.failed > 0 ? ` · ${syncResult.failed} failed` : ''}`}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...C.btn, flex: 1, justifyContent: 'center' }} onClick={handleSync} disabled={syncing || pulling}>
              <RefreshCw size={13} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button style={{ ...C.btn2, flexShrink: 0 }} onClick={handleFullSync} disabled={syncing || pulling}>
              <Database size={13} /> Full Sync
            </button>
            {syncStatus.failed > 0 && (
              <button style={C.btn2} onClick={handleResetFailed}><AlertTriangle size={13} /> Retry</button>
            )}
          </div>
          <button style={{ ...C.btn2, justifyContent: 'center', background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#059669' }} onClick={handlePullAll} disabled={syncing || pulling}>
            <Database size={13} color="#059669" /> {pulling ? 'Pulling...' : 'Pull All from Server (Fresh Install)'}
          </button>
        </div>

        {/* â”€â”€ Right: Tabs â”€â”€ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Tab Bar */}
          <div style={{ ...C.tabBar, marginBottom: 14 }}>
            {TABS.map((t, i) => (
              <button key={t} style={C.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>
            ))}
          </div>

          {/* Local Backup */}
          {tab === 0 && (
            <div style={C.cardP}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Database size={18} color="#00deab" />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>SQLite Database Backup</p>
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0' }}>Saves to your Documents folder</p>
                </div>
              </div>
              <Msg msg={backupMsg} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...C.btn, flex: 1, justifyContent: 'center' }} onClick={handleBackup} disabled={backing}>
                  <HardDrive size={14} />{backing ? 'Backing up...' : 'Create Backup'}
                </button>
                <button style={{ ...C.btn2, flexShrink: 0 }} onClick={() => window.api.backup.openFolder()}>
                  <FolderOpen size={14} /> Open Folder
                </button>
              </div>
            </div>
          )}

          {/* Auto Backup */}
          {tab === 1 && (
            <div style={C.cardP}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Auto Backup</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: '#334155' }}>Enable Daily Auto Backup</span>
                <div onClick={() => setAutoEnabled(v => !v)} style={{ width: 40, height: 22, borderRadius: 99, background: autoEnabled ? '#00deab' : '#e2e8f0', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s', transform: autoEnabled ? 'translateX(21px)' : 'translateX(3px)' }} />
                </div>
              </div>
              {autoEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>Backup Time</label>
                  <input type="time" value={autoTime} onChange={e => setAutoTime(e.target.value)} style={{ ...C.input, flex: 1 }} />
                </div>
              )}
              <Msg msg={autoMsg} />
              <button style={{ ...C.btn, width: '100%', justifyContent: 'center' }} onClick={saveAutoConfig}>
                Save Auto Backup Settings
              </button>
            </div>
          )}

          {/* Restore */}
          {tab === 2 && (
            <div style={C.cardP}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Restore</p>
              <Msg msg={restoreMsg} onClose={() => { setRestoreMsg(''); clearTimeout(timerRef.current) }} />
              <button style={{ ...C.btnD, width: '100%', justifyContent: 'center' }} onClick={handleRestore} disabled={restoring}>
                <Upload size={14} />{restoring ? 'Restoring...' : 'Restore from Backup File...'}
              </button>
              <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', margin: '8px 0 0' }}>Opens a file picker to select a .db backup file</p>
            </div>
          )}

          {/* Backup History */}
          {tab === 3 && (
            <div style={{ ...C.card, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', margin: 0 }}>Backup History</p>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{backups.length} backups</span>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 320 }}>
                {(() => {
                  const today = new Date(); today.setHours(0,0,0,0)
                  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
                  const filtered = backups.filter(b => {
                    if (!b.created_at) return false
                    const d = new Date(b.created_at.includes('T') ? b.created_at : b.created_at.replace(' ','T')+'Z')
                    d.setHours(0,0,0,0)
                    return d >= yesterday
                  })
                  if (!filtered.length) return (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <HardDrive size={28} color="#e2e8f0" style={{ margin: '0 auto 8px' }} />
                      <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>No backups in last 2 days.</p>
                    </div>
                  )
                  // Group by date
                  const groups = {}
                  filtered.forEach(b => {
                    const d = new Date(b.created_at.includes('T') ? b.created_at : b.created_at.replace(' ','T')+'Z')
                    const key = d.toDateString()
                    if (!groups[key]) groups[key] = []
                    groups[key].push(b)
                  })
                  return Object.entries(groups).map(([dateKey, items]) => {
                    const d = new Date(dateKey)
                    const t = new Date(); t.setHours(0,0,0,0)
                    const label = d.getTime() === t.getTime() ? 'Today' : 'Yesterday'
                    return (
                      <div key={dateKey}>
                        <div style={{ padding: '6px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label} - {d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        {items.map((b, i) => {
                          const isLocal = b.type === 'local'
                          const isDrive = b.type === 'google_drive'
                          const typeColor = isLocal ? '#00deab' : isDrive ? '#059669' : '#0ea5e9'
                          const typeBg   = isLocal ? '#ecfdf5' : isDrive ? '#ecfdf5' : '#e0f2fe'
                          const typeLabel = isDrive ? 'â˜ Drive' : b.type === 'onedrive' ? 'â˜ OneDrive' : '💾 Local'
                          const timeStr = new Date(b.created_at.includes('T') ? b.created_at : b.created_at.replace(' ','T')+'Z')
                            .toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })
                          return (
                            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px', borderBottom: i < items.length - 1 ? '1px solid #f8fafc' : 'none' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{ width: 30, height: 30, borderRadius: 8, background: typeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <HardDrive size={13} color={typeColor} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#334155', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {b.path?.split(/[\\\/]/).pop()}
                                </p>
                                <p style={{ fontSize: 10, color: '#94a3b8', margin: '1px 0 0' }}>{timeStr}</p>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{b.size_kb} KB</span>
                                <span style={{ background: typeBg, color: typeColor, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99 }}>{typeLabel}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}



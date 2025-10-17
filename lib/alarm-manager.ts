// Client-side alarm manager to play a looping beep for pending tasks
// and unacknowledged alerts until the user opens the task or acknowledges the alert.
// Uses Web Audio API for a lightweight, built-in sound without assets.

type Severity = "low" | "medium" | "high" | "critical"
type Priority = "low" | "medium" | "high" | "critical"

class AlarmManager {
  private static _instance: AlarmManager | null = null

  static getInstance(): AlarmManager {
    if (!AlarmManager._instance) AlarmManager._instance = new AlarmManager()
    return AlarmManager._instance
  }

  private enabled = false
  private audioCtx: AudioContext | null = null
  private oscillator: OscillatorNode | null = null
  private gain: GainNode | null = null
  private beepInterval: ReturnType<typeof setInterval> | null = null
  private playing = false

  private ringingTaskIds = new Set<string>()
  private ringingAlertIds = new Set<string>()
  private taskPriorities = new Map<string, Priority>()
  private alertSeverities = new Map<string, Severity>()

  // New: audio preferences
  private volume: number = 0.22
  private mutedUntil: number | null = null

  enable() {
    this.enabled = true
    // Attempt to resume audio context on user gesture
    this.ensureAudio()
    this.restoreAudioPreferencesFromStorage()
    this.updatePlayback()
    this.saveEnabled(true)
  }

  disable() {
    this.enabled = false
    this.stopBeeping()
    this.saveEnabled(false)
  }

  isEnabled(): boolean {
    return this.enabled
  }

  restoreEnabledFromStorage() {
    try {
      if (typeof window === "undefined") return
      const raw = localStorage.getItem("alarmEnabled")
      const val = raw === "true"
      this.enabled = val
      this.restoreAudioPreferencesFromStorage()
      if (val) this.ensureAudio()
      this.updatePlayback()
    } catch {}
  }

  private saveEnabled(val: boolean) {
    try {
      if (typeof window === "undefined") return
      localStorage.setItem("alarmEnabled", String(val))
    } catch {}
  }

  // New: manage audio preferences
  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol))
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("alarmVolume", String(this.volume))
      }
    } catch {}
  }

  getVolume() {
    return this.volume
  }

  muteFor(ms: number) {
    this.mutedUntil = Date.now() + Math.max(0, ms)
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("alarmMutedUntil", String(this.mutedUntil))
      }
    } catch {}
    this.updatePlayback()
  }

  isMuted(): boolean {
    return !!(this.mutedUntil && Date.now() < this.mutedUntil)
  }

  private restoreAudioPreferencesFromStorage() {
    try {
      if (typeof window === "undefined") return
      const volRaw = localStorage.getItem("alarmVolume")
      if (volRaw) this.volume = Number(volRaw) || this.volume
      const muteRaw = localStorage.getItem("alarmMutedUntil")
      if (muteRaw) {
        const ts = Number(muteRaw)
        this.mutedUntil = Number.isFinite(ts) ? ts : null
      }
    } catch {}
  }

  // Task alarms
  startTaskAlarm(taskId: string, priority: Priority = "medium") {
    this.ringingTaskIds.add(taskId)
    this.taskPriorities.set(taskId, priority)
    this.updatePlayback()
  }

  stopTaskAlarm(taskId: string) {
    this.ringingTaskIds.delete(taskId)
    this.taskPriorities.delete(taskId)
    this.updatePlayback()
  }

  stopAllTaskAlarms() {
    this.ringingTaskIds.clear()
    this.taskPriorities.clear()
    this.updatePlayback()
  }

  // Alert alarms
  startAlertAlarm(alertId: string, severity: Severity = "high") {
    this.ringingAlertIds.add(alertId)
    this.alertSeverities.set(alertId, severity)
    this.updatePlayback()
  }

  stopAlertAlarm(alertId: string) {
    this.ringingAlertIds.delete(alertId)
    this.alertSeverities.delete(alertId)
    this.updatePlayback()
  }

  stopAllAlertAlarms() {
    this.ringingAlertIds.clear()
    this.alertSeverities.clear()
    this.updatePlayback()
  }

  // Persist opened tasks so they won't ring again after reload
  onTaskOpened(taskId: string) {
    this.markTaskOpened(taskId)
    this.stopTaskAlarm(taskId)
  }

  hasTaskBeenOpened(taskId: string): boolean {
    try {
      if (typeof window === "undefined") return false
      const raw = localStorage.getItem("openedTasks")
      if (!raw) return false
      const ids: string[] = JSON.parse(raw)
      return ids.includes(String(taskId))
    } catch {
      return false
    }
  }

  private markTaskOpened(taskId: string) {
    try {
      if (typeof window === "undefined") return
      const raw = localStorage.getItem("openedTasks")
      const ids: string[] = raw ? JSON.parse(raw) : []
      if (!ids.includes(String(taskId))) {
        ids.push(String(taskId))
        localStorage.setItem("openedTasks", JSON.stringify(ids))
      }
    } catch {}
  }

  // Internal helpers
  private ensureAudio() {
    if (typeof window === "undefined") return
    if (this.audioCtx) return
    try {
      // @ts-ignore - Safari prefix
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return
      this.audioCtx = new AC()
      this.gain = this.audioCtx.createGain()
      this.gain.gain.value = 0
      this.gain.connect(this.audioCtx.destination)
      this.oscillator = this.audioCtx.createOscillator()
      this.oscillator.type = "sine"
      this.oscillator.frequency.value = 880
      this.oscillator.connect(this.gain)
      this.oscillator.start()
    } catch (e) {
      // Fallback: do nothing if audio cannot be initialized
      console.warn("AlarmManager: failed to init audio", e)
    }
  }

  private computeFrequency(): number {
    // Choose the highest urgency among active alarms
    let level: Severity | Priority = "medium"

    const levels: (Severity | Priority)[] = []
    // Alerts
    for (const sev of this.alertSeverities.values()) levels.push(sev)
    // Tasks (priority)
    for (const pr of this.taskPriorities.values()) levels.push(pr)

    if (levels.length === 0) return 880

    // Rank order
    const rank = (v: Severity | Priority) => {
      switch (v) {
        case "critical": return 4
        case "high": return 3
        case "medium": return 2
        case "low": return 1
        default: return 2
      }
    }

    level = levels.sort((a, b) => rank(b) - rank(a))[0]

    switch (level) {
      case "critical": return 1200
      case "high": return 1000
      case "medium": return 880
      case "low": return 720
      default: return 880
    }
  }

  private updatePlayback() {
    if (!this.enabled) {
      this.stopBeeping()
      return
    }
    // Respect temporary mute
    if (this.isMuted()) {
      this.stopBeeping()
      return
    }
    const anyActive = this.ringingTaskIds.size > 0 || this.ringingAlertIds.size > 0
    if (anyActive) this.startBeeping()
    else this.stopBeeping()
  }

  private startBeeping() {
    this.ensureAudio()
    if (!this.audioCtx || !this.gain || !this.oscillator) return
    if (this.playing) return
    this.playing = true

    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {})
    }

    // Toggle gain on/off periodically to create beeps
    let on = true
    const intervalMs = 450
    this.beepInterval = setInterval(() => {
      if (!this.audioCtx || !this.gain || !this.oscillator) return
      const now = this.audioCtx.currentTime
      // Adjust frequency based on highest urgency
      const freq = this.computeFrequency()
      try {
        this.oscillator.frequency.setValueAtTime(freq, now)
      } catch {}
      if (on) {
        // fade in to avoid clicks
        try { this.gain.gain.setTargetAtTime(this.volume, now, 0.01) } catch {}
      } else {
        try { this.gain.gain.setTargetAtTime(0.0, now, 0.01) } catch {}
      }
      on = !on
    }, intervalMs)
  }

  private stopBeeping() {
    if (this.beepInterval) {
      clearInterval(this.beepInterval)
      this.beepInterval = null
    }
    if (this.gain && this.audioCtx) {
      const now = this.audioCtx.currentTime
      try { this.gain.gain.setTargetAtTime(0.0, now, 0.01) } catch {}
    }
    this.playing = false
  }
}

export const alarmManager = AlarmManager.getInstance()
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { apiRequest, ApiError, clearSession, readStoredUser, type User } from '../api'

type Project = { id: string; name: string; created_at: string }
type LogEntry = {
  id: string
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  message: string
  metadata: Record<string, unknown>
  created_at: string
}
type ApiEnvelope<T> = { success: boolean; message: string; data: T }

const router = useRouter()
const user = ref<User | null>(readStoredUser())
const projects = ref<Project[]>([])
const selectedProjectId = ref('')
const logs = ref<LogEntry[]>([])
const pageBusy = ref(false)
const logsBusy = ref(false)
const createBusy = ref(false)
const showProjectForm = ref(false)
const projectName = ref('')
const createdApiKey = ref('')
const selectedLevel = ref('')
const searchQuery = ref('')
const errorMessage = ref('')
const noticeMessage = ref('')
let logRequestVersion = 0

const selectedProject = computed(
  () => projects.value.find((project) => project.id === selectedProjectId.value) ?? null,
)
const weekdayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long' })
  .format(new Date())
  .toUpperCase()

const visibleLogs = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return logs.value
  return logs.value.filter((log) => {
    const content = `${log.message} ${JSON.stringify(log.metadata)}`.toLowerCase()
    return content.includes(query)
  })
})

const levelCounts = computed(() => ({
  error: logs.value.filter((log) => log.level === 'error' || log.level === 'fatal').length,
  warn: logs.value.filter((log) => log.level === 'warn').length,
  info: logs.value.filter((log) => log.level === 'info' || log.level === 'debug').length,
}))

function showError(error: unknown) {
  errorMessage.value = error instanceof Error ? error.message : 'Something went wrong.'
  noticeMessage.value = ''
}

function clearMessages() {
  errorMessage.value = ''
  noticeMessage.value = ''
}

async function loadProjects() {
  pageBusy.value = true
  clearMessages()
  try {
    const result = await apiRequest<ApiEnvelope<Project[]>>('/api/projects')
    projects.value = result.data
    if (!result.data.some((project) => project.id === selectedProjectId.value)) {
      selectedProjectId.value = result.data[0]?.id ?? ''
    }
  } catch (error) {
    showError(error)
    if (error instanceof ApiError && error.status === 401) logout()
  } finally {
    pageBusy.value = false
  }
}

async function loadLogs() {
  const requestVersion = ++logRequestVersion
  if (!selectedProjectId.value || !localStorage.getItem('logpulse.token')) {
    logs.value = []
    logsBusy.value = false
    return
  }

  logsBusy.value = true
  clearMessages()
  const params = new URLSearchParams({
    projectId: selectedProjectId.value,
    limit: '100',
    offset: '0',
  })
  if (selectedLevel.value) params.set('level', selectedLevel.value)

  try {
    const result = await apiRequest<ApiEnvelope<LogEntry[]>>(`/api/v1/logs?${params}`)
    if (requestVersion === logRequestVersion) logs.value = result.data
  } catch (error) {
    if (requestVersion === logRequestVersion) {
      showError(error)
      if (error instanceof ApiError && error.status === 401) logout()
    }
  } finally {
    if (requestVersion === logRequestVersion) logsBusy.value = false
  }
}

async function createProject() {
  clearMessages()
  createBusy.value = true
  try {
    const result = await apiRequest<
      ApiEnvelope<{ id: string; name: string; createdAt: string }> & { apiKey: string }
    >('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: projectName.value }),
    })
    createdApiKey.value = result.apiKey
    projectName.value = ''
    await loadProjects()
    selectedProjectId.value = result.data.id
  } catch (error) {
    showError(error)
  } finally {
    createBusy.value = false
  }
}

async function copyApiKey() {
  try {
    await navigator.clipboard.writeText(createdApiKey.value)
    noticeMessage.value = 'API key copied to clipboard.'
    errorMessage.value = ''
  } catch {
    showError(new Error('Could not access the clipboard. Select and copy the key manually.'))
  }
}

function closeProjectDialog() {
  showProjectForm.value = false
  createdApiKey.value = ''
  clearMessages()
}

function logout() {
  clearSession()
  user.value = null
  projects.value = []
  selectedProjectId.value = ''
  logs.value = []
  clearMessages()
  void router.replace({ name: 'login' })
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))
}

function formatMetadata(metadata: Record<string, unknown>) {
  return JSON.stringify(metadata)
}

watch([selectedProjectId, selectedLevel], loadLogs)

onMounted(() => {
  void loadProjects()
})
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <RouterLink class="brand" to="/dashboard" aria-label="LogPulse dashboard">
        <span class="brand-mark"><span></span><span></span><span></span></span>
        <span>log<span class="brand-accent">pulse</span></span>
      </RouterLink>

      <div class="workspace-label">WORKSPACE</div>
      <div class="workspace-switcher">
        <span class="workspace-avatar">{{ (user?.email?.[0] ?? 'L').toUpperCase() }}</span>
        <span class="workspace-name">{{ user?.email ?? 'My workspace' }}</span>
        <span class="workspace-caret">⌄</span>
      </div>

      <div class="nav-caption">MONITORING</div>
      <RouterLink class="nav-item nav-active" to="/dashboard">
        <span class="nav-icon icon-overview"></span> Overview
        <span class="active-rail"></span>
      </RouterLink>

      <div class="project-heading">
        <span class="nav-caption">PROJECTS</span>
        <button class="icon-button add-project" type="button" aria-label="Create project" @click="showProjectForm = true">+</button>
      </div>
      <div class="project-nav">
        <button
          v-for="project in projects"
          :key="project.id"
          class="nav-item project-item"
          :class="{ 'project-selected': selectedProjectId === project.id }"
          type="button"
          @click="selectedProjectId = project.id"
        >
          <span class="project-glyph">{{ project.name.slice(0, 1).toUpperCase() }}</span>
          <span class="project-nav-name">{{ project.name }}</span>
        </button>
        <div v-if="!projects.length && !pageBusy" class="sidebar-empty">No projects yet</div>
      </div>

      <div class="sidebar-bottom">
        <div class="sidebar-help"><span class="help-icon">?</span><span><strong>Need a hand?</strong><small>Check the API guide</small></span><span class="help-arrow">↗</span></div>
        <button class="profile-button" type="button" @click="logout">
          <span class="profile-avatar">{{ (user?.email?.[0] ?? 'L').toUpperCase() }}</span>
          <span class="profile-details"><strong>{{ user?.email ?? 'LogPulse user' }}</strong><small>Personal workspace</small></span>
          <span class="logout-icon" aria-hidden="true">↗</span>
        </button>
      </div>
    </aside>

    <section class="main-panel">
      <header class="topbar">
        <div class="breadcrumbs"><span>Workspace</span><span class="breadcrumb-divider">/</span><strong>Overview</strong></div>
        <div class="topbar-actions">
          <span class="live-indicator"><span class="status-dot"></span> All systems operational</span>
          <button class="icon-button top-add" type="button" aria-label="Create project" @click="showProjectForm = true">+</button>
          <button class="top-avatar" type="button" :aria-label="`Sign out ${user?.email ?? ''}`" @click="logout">
            {{ (user?.email?.[0] ?? 'L').toUpperCase() }}
          </button>
        </div>
      </header>

      <main class="content">
        <div class="page-heading">
          <div>
            <p class="eyebrow">{{ weekdayLabel }}, YOUR WORKSPACE</p>
            <h1>Good to see you<span class="heading-period">.</span></h1>
            <p class="page-subtitle">A live view of what’s happening across your projects.</p>
          </div>
          <button class="button button-primary create-button" type="button" @click="showProjectForm = true">
            <span class="button-plus">+</span> New project
          </button>
        </div>

        <div v-if="errorMessage" class="message message-error page-message" role="alert">
          <span>{{ errorMessage }}</span>
          <button type="button" aria-label="Dismiss error" @click="errorMessage = ''">×</button>
        </div>
        <div v-if="noticeMessage" class="message message-success page-message" role="status">
          <span>{{ noticeMessage }}</span>
          <button type="button" aria-label="Dismiss message" @click="noticeMessage = ''">×</button>
        </div>

        <section class="stats-grid" aria-label="Log summary">
          <article class="stat-card">
            <div class="stat-top"><span class="stat-icon projects-icon">◈</span><span class="stat-trend">YOUR WORKSPACE</span></div>
            <div class="stat-value">{{ projects.length }}</div>
            <div class="stat-label">Total projects</div>
            <div class="stat-bottom"><span class="stat-mini-bars"><i></i><i></i><i></i><i></i><i></i><i></i></span><span>Ready to monitor</span></div>
          </article>
          <article class="stat-card">
            <div class="stat-top"><span class="stat-icon logs-icon">⌁</span><span class="stat-trend trend-green"><span class="tiny-dot"></span> LIVE FEED</span></div>
            <div class="stat-value">{{ logs.length }}<span class="stat-unit">/ 100</span></div>
            <div class="stat-label">Recent log events</div>
            <div class="stat-bottom"><span class="stat-bottom-icon">↘</span><span>Latest for selected project</span></div>
          </article>
          <article class="stat-card">
            <div class="stat-top"><span class="stat-icon errors-icon">!</span><span class="stat-trend">NEEDS ATTENTION</span></div>
            <div class="stat-value">{{ levelCounts.error }}</div>
            <div class="stat-label">Errors & critical</div>
            <div class="stat-bottom"><span class="severity-pill severity-error">ERROR</span><span>In recent events</span></div>
          </article>
          <article class="stat-card stat-card-muted">
            <div class="stat-top"><span class="stat-icon warning-icon">⌁</span><span class="stat-trend">KEEP AN EYE ON</span></div>
            <div class="stat-value">{{ levelCounts.warn }}</div>
            <div class="stat-label">Warnings</div>
            <div class="stat-bottom"><span class="severity-pill severity-warn">WARN</span><span>In recent events</span></div>
          </article>
        </section>

        <section class="logs-card">
          <div class="logs-header">
            <div>
              <div class="section-title-row"><h2>Recent activity</h2><span class="count-badge">{{ visibleLogs.length }}</span></div>
              <p class="section-description">
                <template v-if="selectedProject">{{ selectedProject.name }} · Latest 100 events</template>
                <template v-else>Choose a project to see its log activity</template>
              </p>
            </div>
            <button class="button button-secondary refresh-button" type="button" :disabled="logsBusy || !selectedProjectId" @click="loadLogs">
              <span :class="{ spinning: logsBusy }">↻</span> Refresh
            </button>
          </div>
          <div class="filter-row">
            <label class="search-box">
              <span class="search-icon" aria-hidden="true"></span>
              <input v-model="searchQuery" type="search" placeholder="Search events…" aria-label="Search events" />
            </label>
            <label class="filter-select-wrap">
              <span class="filter-icon">☷</span>
              <select v-model="selectedLevel" aria-label="Filter logs by severity">
                <option value="">All levels</option>
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
              </select>
              <span class="select-chevron">⌄</span>
            </label>
            <button class="icon-button filter-more" type="button" aria-label="Clear filters" @click="selectedLevel = ''; searchQuery = ''">↺</button>
          </div>

          <div class="log-table-wrap">
            <table class="log-table">
              <thead>
                <tr><th>SEVERITY</th><th>EVENT</th><th>METADATA</th><th>TIME</th></tr>
              </thead>
              <tbody>
                <tr v-for="log in visibleLogs" :key="log.id">
                  <td><span class="severity-pill" :class="`severity-${log.level}`"><span class="severity-dot"></span>{{ log.level }}</span></td>
                  <td><span class="log-message">{{ log.message }}</span><span class="log-id">{{ log.id.slice(0, 8) }}</span></td>
                  <td><code class="metadata-cell">{{ formatMetadata(log.metadata) }}</code></td>
                  <td><span class="log-time">{{ formatTime(log.created_at) }}</span><span class="log-date">{{ formatDate(log.created_at) }}</span></td>
                </tr>
                <tr v-if="!logsBusy && visibleLogs.length === 0">
                  <td colspan="4">
                    <div class="empty-state">
                      <div class="empty-orbit"><span>⌁</span></div>
                      <strong>{{ projects.length ? 'No events to show' : 'Start with your first project' }}</strong>
                      <p>
                        {{ !projects.length ? 'Create a project to get an API key and start sending logs.' : searchQuery || selectedLevel ? 'Try adjusting your search or severity filter.' : 'When your application sends logs, they will appear here.' }}
                      </p>
                      <button v-if="!projects.length" class="button button-secondary" type="button" @click="showProjectForm = true">Create a project <span>→</span></button>
                    </div>
                  </td>
                </tr>
                <tr v-if="logsBusy">
                  <td colspan="4"><div class="table-loading"><span class="loading-spinner"></span> Loading recent events…</div></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="logs-footer">
            <span>Showing <strong>{{ visibleLogs.length }}</strong> of {{ logs.length }} recent events</span>
            <span class="footer-live"><span class="status-dot"></span> Updated just now</span>
          </div>
        </section>
        <footer class="content-footer"><span>© 2026 LogPulse</span><span>Built for a clearer signal <span class="footer-spark">✳</span></span></footer>
      </main>
    </section>

    <div v-if="showProjectForm" class="modal-backdrop" @click.self="closeProjectDialog">
      <section class="modal-card" role="dialog" aria-modal="true" :aria-labelledby="createdApiKey ? 'key-title' : 'project-title'">
        <button class="modal-close" type="button" aria-label="Close dialog" @click="closeProjectDialog">×</button>
        <template v-if="createdApiKey">
          <div class="modal-icon key-modal-icon">✓</div>
          <p class="eyebrow">PROJECT CREATED</p>
          <h2 id="key-title">Save your API key</h2>
          <p class="modal-description">This key is shown only once. Add it to your app to start sending logs.</p>
          <div class="api-key-field"><code>{{ createdApiKey }}</code><button class="button button-secondary" type="button" @click="copyApiKey">Copy</button></div>
          <p class="key-warning"><span>!</span> Store this key securely. It cannot be viewed again.</p>
          <button class="button button-primary modal-submit" type="button" @click="closeProjectDialog">I’ve saved my key</button>
        </template>
        <template v-else>
          <div class="modal-icon">◈</div>
          <p class="eyebrow">GET STARTED</p>
          <h2 id="project-title">Create a project</h2>
          <p class="modal-description">Give your application a name. You can connect it and start collecting logs right away.</p>
          <form class="project-form" @submit.prevent="createProject">
            <label for="project-name">Project name</label>
            <input id="project-name" v-model.trim="projectName" type="text" minlength="2" placeholder="e.g. Payments API" required autofocus />
            <p v-if="errorMessage" class="message message-error" role="alert">{{ errorMessage }}</p>
            <button class="button button-primary modal-submit" type="submit" :disabled="createBusy">
              {{ createBusy ? 'Creating…' : 'Create project' }} <span aria-hidden="true">→</span>
            </button>
          </form>
        </template>
      </section>
    </div>
  </div>
</template>

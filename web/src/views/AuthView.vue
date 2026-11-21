<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiRequest, saveSession, type User } from '../api'

const props = defineProps<{ mode: 'login' | 'register' }>()
const route = useRoute()
const router = useRouter()
const email = ref('')
const password = ref('')
const busy = ref(false)
const errorMessage = ref('')

async function authenticate() {
  errorMessage.value = ''
  busy.value = true
  try {
    const endpoint = props.mode === 'login' ? '/api/auth/login' : '/api/auth/register'
    const result = await apiRequest<{
      data: { token: string; user: User }
    }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ email: email.value, password: password.value }),
    })
    saveSession(result.data.token, result.data.user)
    const redirect = route.query.redirect
    const destination =
      typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
        ? redirect
        : { name: 'dashboard' }
    await router.replace(destination)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Something went wrong.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <RouterLink class="brand brand-auth" to="/login" aria-label="LogPulse home">
        <span class="brand-mark"><span></span><span></span><span></span></span>
        <span>log<span class="brand-accent">pulse</span></span>
      </RouterLink>
      <div class="auth-copy">
        <p class="eyebrow">YOUR LOGS, IN FOCUS</p>
        <h1>{{ mode === 'login' ? 'Welcome back.' : 'Make sense of every signal.' }}</h1>
        <p>One calm place to see what your applications are telling you.</p>
      </div>
      <form class="auth-form" @submit.prevent="authenticate">
        <label for="email">Email address</label>
        <input
          id="email"
          v-model.trim="email"
          type="email"
          autocomplete="email"
          placeholder="you@company.com"
          required
        />
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          type="password"
          minlength="8"
          placeholder="At least 8 characters"
          required
        />
        <p v-if="errorMessage" class="message message-error" role="alert">{{ errorMessage }}</p>
        <button class="button button-primary auth-submit" type="submit" :disabled="busy">
          {{ busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account' }}
          <span aria-hidden="true">→</span>
        </button>
      </form>
      <p class="auth-switch">
        {{ mode === 'login' ? 'New to LogPulse?' : 'Already have an account?' }}
        <RouterLink :to="{ name: mode === 'login' ? 'register' : 'login' }">
          {{ mode === 'login' ? 'Create an account' : 'Sign in' }}
        </RouterLink>
      </p>
      <div class="auth-foot"><span class="status-dot"></span> Your workspace is ready when you are</div>
    </section>
    <aside class="auth-aside">
      <div class="aside-grid"></div>
      <div class="aside-content">
        <div class="signal-line"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
        <p class="eyebrow">OBSERVABILITY, WITHOUT THE NOISE</p>
        <h2>Find the signal.<br />Fix what matters.</h2>
        <p>Project health, application logs, and the details behind every event — all together.</p>
        <div class="aside-caption"><span class="status-dot"></span> Collecting signals across your stack</div>
      </div>
      <div class="aside-index">LOGPULSE <span>·</span> 01</div>
    </aside>
  </main>
</template>

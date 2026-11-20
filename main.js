import { contactEndpoint } from './config.js'

document.querySelector('#year').textContent = String(new Date().getFullYear())

const DELIVER = contactEndpoint
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formBody(form) {
  return Object.fromEntries(new FormData(form).entries())
}

function setStatus(node, kind, text) {
  node.className = `status ${kind}`
  node.textContent = text
}

function honeypot(body) {
  return String(body.company || '').trim().length > 0
}

async function deliver(fields) {
  const response = await fetch(DELIVER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      ...fields,
      _captcha: 'false',
      _template: 'table',
      _honey: '',
    }),
  })
  const payload = await response.json().catch(() => ({}))
  const ok = response.ok && (payload.success === true || payload.success === 'true')
  return { ok, payload }
}

const waitlist = document.querySelector('#waitlist-form')
const waitlistStatus = document.querySelector('#waitlist-status')
waitlist.addEventListener('submit', async (event) => {
  event.preventDefault()
  setStatus(waitlistStatus, '', '')
  const body = formBody(waitlist)
  if (honeypot(body)) {
    waitlist.reset()
    setStatus(waitlistStatus, 'ok', 'You are on the list.')
    return
  }
  if (!EMAIL.test(String(body.email || '').trim())) {
    setStatus(waitlistStatus, 'bad', 'That email does not look usable.')
    return
  }
  const button = waitlist.querySelector('button')
  button.disabled = true
  try {
    const result = await deliver({
      email: String(body.email).trim(),
      message: 'Waitlist signup',
      _subject: 'Color Collab waitlist signup',
    })
    if (!result.ok) {
      setStatus(waitlistStatus, 'bad', result.payload.message || 'The list didn’t save. Try again in a minute.')
      return
    }
    waitlist.reset()
    setStatus(waitlistStatus, 'ok', 'You are on the list.')
  } catch {
    setStatus(waitlistStatus, 'bad', 'The list didn’t save. Try again in a minute.')
  } finally {
    button.disabled = false
  }
})

const contact = document.querySelector('#contact-form')
const contactStatus = document.querySelector('#contact-status')
contact.addEventListener('submit', async (event) => {
  event.preventDefault()
  for (const node of contact.querySelectorAll('.field-error')) node.textContent = ''
  setStatus(contactStatus, '', '')
  const body = formBody(contact)
  if (honeypot(body)) {
    contact.reset()
    setStatus(contactStatus, 'ok', 'Sent.')
    return
  }
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim()
  const message = String(body.message || '').trim()
  const errors = {}
  if (name.length < 2) errors.name = 'Add your name.'
  if (!EMAIL.test(email)) errors.email = 'That email does not look usable.'
  if (message.length < 10) errors.message = 'Write a little more so we know how to help.'
  if (Object.keys(errors).length) {
    for (const [key, text] of Object.entries(errors)) {
      const slot = contact.querySelector(`[data-for="${key}"]`)
      if (slot) slot.textContent = text
    }
    setStatus(contactStatus, 'bad', 'Check the form and try again.')
    return
  }
  const button = contact.querySelector('button')
  button.disabled = true
  try {
    const result = await deliver({
      name,
      email,
      message,
      _replyto: email,
      _subject: `Color Collab contact from ${name}`,
    })
    if (!result.ok) {
      setStatus(contactStatus, 'bad', result.payload.message || 'We could not deliver that message. Please try again in a minute.')
      return
    }
    contact.reset()
    setStatus(contactStatus, 'ok', 'Sent.')
  } catch {
    setStatus(contactStatus, 'bad', 'We could not deliver that message. Please try again in a minute.')
  } finally {
    button.disabled = false
  }
})

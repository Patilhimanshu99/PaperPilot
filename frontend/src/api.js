
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function readResponse(res, fallbackMessage) {
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : fallbackMessage
    )
  }

  return data
}

// Robust fetch with retry for backend cold starts and network glitches
async function fetchWithRetry(url, options = {}, retries = 2, timeoutMs = 45000) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timer)
      return res
    } catch (err) {
      clearTimeout(timer)
      lastErr = err
      // If user aborted or it's the last attempt, don't sleep & retry
      if (attempt === retries) break
      // Wait 600ms before retrying on network errors like ECONNREFUSED/Failed to fetch
      await new Promise((r) => setTimeout(r, 600))
    }
  }
  if (lastErr && lastErr.name === 'AbortError') {
    throw new Error('Connection timed out. The backend server may be starting up or busy.')
  }
  throw new Error(lastErr?.message === 'Failed to fetch' 
    ? 'Cannot connect to backend (http://localhost:8000). Please check if backend is running.'
    : (lastErr?.message || 'Network request failed'))
}

// Upload PDFs and normalize the response for Sidebar.jsx.
export async function uploadPapers(files) {
  const formData = new FormData()

  for (const file of files) {
    formData.append('files', file)
  }

  const res = await fetchWithRetry(`${BASE_URL}/api/papers`, {
    method: 'POST',
    body: formData,
  }, 1, 60000)

  const data = await readResponse(res, 'Upload failed')
  const uploaded = Array.isArray(data.uploaded) ? data.uploaded : []

  return {
    ...data,
    papers: uploaded.map((paper) => ({
      title: paper.filename,
      chunks: paper.chunks ?? 0,
    })),
  }
}

// Get the papers currently saved on the backend.
export async function getPapers() {
  const res = await fetchWithRetry(`${BASE_URL}/api/papers`, { method: 'GET' }, 1, 15000)
  const data = await readResponse(res, 'Could not fetch papers')
  const list = Array.isArray(data.papers) ? data.papers : []

  return {
    ...data,
    papers: list.map((paper) => {
      if (typeof paper === 'string') {
        return { title: paper, chunks: 0 }
      }

      return {
        title: paper.title ?? paper.filename ?? 'Untitled PDF',
        chunks: paper.chunks ?? 0,
      }
    }),
  }
}

// Clear all papers. Requires DELETE /api/papers in main.py.
export async function clearPapers() {
  const res = await fetch(`${BASE_URL}/api/papers`, {
    method: 'DELETE',
  })

  return readResponse(res, 'Could not clear papers')
}

// Ask a question using the selected retrieval method.
export async function askQuestion(question, method) {
  const res = await fetchWithRetry(`${BASE_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, method }),
  }, 1, 40000)

  return readResponse(res, 'Ask failed')
}

// Compare retrieval methods. Requires POST /api/compare in main.py.
export async function compareQuestion(question) {
  const res = await fetchWithRetry(`${BASE_URL}/api/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  }, 1, 30000)

  return readResponse(res, 'Compare failed')
}

import { useEffect, useRef, useCallback } from 'react'

const ICONS = [
    'amp.svg', 'antigravity.svg', 'claude-code.svg', 'clawdbot.svg',
    'cline.svg', 'codex.svg', 'copilot.svg', 'cursor.svg',
    'droid.svg', 'gemini.svg', 'goose.svg', 'kilo.svg',
    'kiro-cli.svg', 'opencode.svg', 'roo.svg', 'trae.svg',
    'vscode.svg', 'windsurf.svg'
]

const ICON_URLS = {
    'amp': 'https://ampcode.com',
    'antigravity': 'https://antigravity.google/',
    'claude-code': 'https://docs.anthropic.com/en/docs/claude-code/overview',
    'clawdbot': 'https://openclaw.ai/',
    'cline': 'https://cline.bot',
    'codex': 'https://openai.com/index/introducing-codex/',
    'copilot': 'https://github.com/features/copilot',
    'cursor': 'https://cursor.com',
    'droid': 'https://factory.ai/',
    'gemini': 'https://gemini.google.com',
    'goose': 'https://block.github.io/goose/',
    'kilo': 'https://kilo.ai/',
    'kiro-cli': 'https://kiro.dev',
    'opencode': 'https://opencode.ai',
    'roo': 'https://roocode.com',
    'trae': 'https://trae.ai',
    'vscode': 'https://code.visualstudio.com',
    'windsurf': 'https://windsurf.com',
}

const ICON_NAMES = {
    'clawdbot': 'OpenClaw',
    'droid': 'Factory',
}

// Fibonacci sphere distribution for even point placement
function fibonacciSphere(n) {
    const points = []
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 2
        const radiusAtY = Math.sqrt(1 - y * y)
        const theta = goldenAngle * i
        points.push({
            x: Math.cos(theta) * radiusAtY,
            y: y,
            z: Math.sin(theta) * radiusAtY
        })
    }
    return points
}

// Canvas pixel processing: make near-black pixels transparent
function removeBlackFromImage(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const d = imageData.data
            for (let i = 0; i < d.length; i += 4) {
                const brightness = (d[i] + d[i + 1] + d[i + 2]) / 3
                if (brightness < 35) {
                    d[i + 3] = 0
                } else if (brightness < 70) {
                    d[i + 3] = Math.round(((brightness - 35) / 35) * d[i + 3])
                }
            }
            ctx.putImageData(imageData, 0, 0)
            resolve(canvas.toDataURL('image/png'))
        }
        img.src = dataUrl
    })
}

export default function IconSphere({ size = 480 }) {
    const containerRef = useRef(null)
    const tooltipRef = useRef(null)
    const stateRef = useRef({
        angleX: 0,
        angleY: 0,
        velocityX: 0,
        velocityY: 0,
        isUserDriven: false,
        isDragging: false,
        lastMouseX: 0,
        lastMouseY: 0,
        lastDragTime: 0,
        dragVelX: 0,
        dragVelY: 0,
        nodes: [],
        animId: null,
    })

    // Tuning — scale relative to the container size
    const RADIUS = size * 0.42
    const ICON_SIZE = size * 0.44
    const FOV = size * 1.3
    const DEPTH_OPACITY_MIN = 0.08
    const DEPTH_OPACITY_MAX = 1.0
    const DEPTH_SCALE_MIN = 0.4
    const DEPTH_SCALE_MAX = 1.1
    const FRICTION = 0.97
    const SENSITIVITY = 0.004
    const AUTO_SPEED_Y = 0.005
    const AUTO_SPEED_X = 0.0012

    const points = useRef(fibonacciSphere(ICONS.length)).current

    // --- Rotation helpers ---
    const rotateX = (p, angle) => {
        const cos = Math.cos(angle), sin = Math.sin(angle)
        return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos }
    }
    const rotateY = (p, angle) => {
        const cos = Math.cos(angle), sin = Math.sin(angle)
        return { x: p.x * cos + p.z * sin, y: p.y, z: -p.x * sin + p.z * cos }
    }

    const render = useCallback(() => {
        const s = stateRef.current
        const items = []
        s.nodes.forEach(({ el, point }) => {
            let p = rotateX(point, s.angleX)
            p = rotateY(p, s.angleY)
            const z = p.z * RADIUS
            const scale3d = FOV / (FOV + z)
            const projX = p.x * RADIUS * scale3d
            const projY = p.y * RADIUS * scale3d
            const depthNorm = (p.z + 1) / 2
            const opacity = DEPTH_OPACITY_MIN + depthNorm * (DEPTH_OPACITY_MAX - DEPTH_OPACITY_MIN)
            const scale = DEPTH_SCALE_MIN + depthNorm * (DEPTH_SCALE_MAX - DEPTH_SCALE_MIN)
            items.push({ el, projX, projY, z: p.z, opacity, scale, scale3d })
        })
        items.sort((a, b) => a.z - b.z)
        items.forEach(({ el, projX, projY, opacity, scale, scale3d }, idx) => {
            const tx = projX - ICON_SIZE / 2
            const ty = projY - ICON_SIZE / 2
            el.style.transform = `translate(${tx}px, ${ty}px) scale(${scale * scale3d})`
            el.style.opacity = opacity
            el.style.zIndex = idx + 1
            el.style.filter = `brightness(${0.5 + opacity * 0.6})`
        })
    }, [RADIUS, FOV, ICON_SIZE, DEPTH_OPACITY_MIN, DEPTH_OPACITY_MAX, DEPTH_SCALE_MIN, DEPTH_SCALE_MAX])

    const animate = useCallback(() => {
        const s = stateRef.current
        if (!s.isDragging) {
            if (s.isUserDriven) {
                s.angleY += s.velocityY
                s.angleX += s.velocityX
                s.velocityX *= FRICTION
                s.velocityY *= FRICTION
                if (Math.abs(s.velocityX) + Math.abs(s.velocityY) < 0.0005) {
                    s.isUserDriven = false
                }
            } else {
                s.angleY += AUTO_SPEED_Y
                s.angleX += AUTO_SPEED_X
            }
        }
        render()
        s.animId = requestAnimationFrame(animate)
    }, [render, FRICTION, AUTO_SPEED_X, AUTO_SPEED_Y])

    useEffect(() => {
        const container = containerRef.current
        const tooltip = tooltipRef.current
        if (!container) return

        const s = stateRef.current
        s.nodes = []

        // Load icons
        async function loadIcons() {
            for (let i = 0; i < ICONS.length; i++) {
                const icon = ICONS[i]
                try {
                    const resp = await fetch(`/svgs/${icon}`)
                    const svgText = await resp.text()
                    const parser = new DOMParser()
                    const doc = parser.parseFromString(svgText, 'image/svg+xml')
                    const svg = doc.querySelector('svg')

                    // Remove black background
                    svg.querySelectorAll('path, rect').forEach(el => {
                        const fill = (el.getAttribute('fill') || '').toLowerCase().trim()
                        const d = el.getAttribute('d') || ''
                        const isBlackFill = fill === '#000' || fill === '#000000' || fill === 'black'
                        if (!isBlackFill) return
                        const isBlackBgPath = /^m0\s*0h\d+v\d+h-?\d+z$/i.test(d.replace(/\s/g, ''))
                        const isBlackBgRect = el.tagName.toLowerCase() === 'rect' &&
                            (!el.getAttribute('x') || el.getAttribute('x') === '0') &&
                            (!el.getAttribute('y') || el.getAttribute('y') === '0')
                        const isBlackFillFullSize = d.includes('h100') && d.includes('v100')
                        if (isBlackBgPath || isBlackBgRect || isBlackFillFullSize) el.remove()
                    })

                    // Process embedded raster images
                    const embeddedImages = svg.querySelectorAll('image')
                    for (const img of embeddedImages) {
                        const href = img.getAttribute('xlink:href') || img.getAttribute('href')
                        if (href && href.startsWith('data:image')) {
                            const cleaned = await removeBlackFromImage(href)
                            if (img.hasAttribute('xlink:href')) img.setAttribute('xlink:href', cleaned)
                            else img.setAttribute('href', cleaned)
                        }
                    }

                    const iconKey = icon.replace('.svg', '')
                    const el = document.createElement('div')
                    el.className = 'sphere-icon-node'
                    el.dataset.name = ICON_NAMES[iconKey] || iconKey.replace(/-/g, ' ')
                    el.dataset.url = ICON_URLS[iconKey] || '#'
                    el.appendChild(svg)
                    container.appendChild(el)
                    s.nodes.push({ el, point: { ...points[i] } })

                    // Click → open official website
                    let pointerMoved = false
                    let touchStartX = 0, touchStartY = 0
                    el.addEventListener('mousedown', () => { pointerMoved = false })
                    el.addEventListener('mousemove', () => { pointerMoved = true })
                    el.addEventListener('click', (e) => {
                        if (!pointerMoved && el.dataset.url && el.dataset.url !== '#') {
                            window.open(el.dataset.url, '_blank', 'noopener,noreferrer')
                        }
                    })
                    // Touch tap — touchstart preventDefault kills click events on mobile
                    el.addEventListener('touchstart', (e) => {
                        const t = e.touches[0]
                        touchStartX = t.clientX
                        touchStartY = t.clientY
                    }, { passive: true })
                    el.addEventListener('touchend', (e) => {
                        const t = e.changedTouches[0]
                        const dx = Math.abs(t.clientX - touchStartX)
                        const dy = Math.abs(t.clientY - touchStartY)
                        if (dx < 10 && dy < 10 && el.dataset.url && el.dataset.url !== '#') {
                            window.open(el.dataset.url, '_blank', 'noopener,noreferrer')
                        }
                    })

                    // Tooltip
                    el.addEventListener('mouseenter', () => {
                        tooltip.textContent = el.dataset.name
                        const rect = el.getBoundingClientRect()
                        tooltip.style.left = (rect.left + rect.width / 2) + 'px'
                        tooltip.style.top = (rect.top - 10) + 'px'
                        tooltip.classList.add('sphere-tooltip-visible')
                    })
                    el.addEventListener('mousemove', () => {
                        const rect = el.getBoundingClientRect()
                        tooltip.style.left = (rect.left + rect.width / 2) + 'px'
                        tooltip.style.top = (rect.top - 10) + 'px'
                    })
                    el.addEventListener('mouseleave', () => {
                        tooltip.classList.remove('sphere-tooltip-visible')
                    })
                } catch (err) {
                    console.warn(`Failed to load ${icon}:`, err)
                }
            }
        }

        loadIcons().then(() => {
            s.animId = requestAnimationFrame(animate)
        })

        // Pointer handlers — scoped to container
        function onPointerDown(e) {
            s.isDragging = true
            s.lastMouseX = e.clientX || e.touches?.[0]?.clientX || 0
            s.lastMouseY = e.clientY || e.touches?.[0]?.clientY || 0
            s.lastDragTime = performance.now()
            s.dragVelX = 0
            s.dragVelY = 0
        }
        function onPointerMove(e) {
            if (!s.isDragging) return
            const x = e.clientX || e.touches?.[0]?.clientX || 0
            const y = e.clientY || e.touches?.[0]?.clientY || 0
            const dx = x - s.lastMouseX
            const dy = y - s.lastMouseY
            const now = performance.now()
            const dt = Math.max(now - s.lastDragTime, 1)
            s.angleY += dx * SENSITIVITY
            s.angleX += dy * SENSITIVITY
            s.dragVelY = (dx * SENSITIVITY) / (dt / 16)
            s.dragVelX = (dy * SENSITIVITY) / (dt / 16)
            s.lastMouseX = x
            s.lastMouseY = y
            s.lastDragTime = now
        }
        function onPointerUp() {
            if (!s.isDragging) return
            s.isDragging = false
            s.velocityY = s.dragVelY
            s.velocityX = s.dragVelX
            s.isUserDriven = true
        }

        container.addEventListener('mousedown', onPointerDown)
        window.addEventListener('mousemove', onPointerMove)
        window.addEventListener('mouseup', onPointerUp)
        container.addEventListener('touchstart', (e) => { e.preventDefault(); onPointerDown(e) }, { passive: false })
        window.addEventListener('touchmove', (e) => { if (s.isDragging) { e.preventDefault(); onPointerMove(e) } }, { passive: false })
        window.addEventListener('touchend', onPointerUp)
        window.addEventListener('touchcancel', onPointerUp)

        return () => {
            if (s.animId) cancelAnimationFrame(s.animId)
            container.removeEventListener('mousedown', onPointerDown)
            window.removeEventListener('mousemove', onPointerMove)
            window.removeEventListener('mouseup', onPointerUp)
            window.removeEventListener('touchend', onPointerUp)
            window.removeEventListener('touchcancel', onPointerUp)
            // Clean up dom nodes
            while (container.firstChild) container.removeChild(container.firstChild)
        }
    }, [animate, points, SENSITIVITY])

    const containerStyle = {
        position: 'relative',
        width: size,
        height: size,
        cursor: 'grab',
        userSelect: 'none',
    }

    return (
        <>
            <div className="translate-x-[40px] translate-y-[20px] sm:translate-x-[30px] sm:translate-y-[20px]" style={{ position: 'relative' }}>
                <div ref={containerRef} style={containerStyle} />
            </div>
            <div ref={tooltipRef} className="sphere-tooltip" />
        </>
    )
}

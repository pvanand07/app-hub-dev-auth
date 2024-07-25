import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jwtVerify, SignJWT } from 'https://esm.sh/jose@4.9.2'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const content = document.getElementById('content')

async function getAppURL() {
    const { data, error } = await supabase
        .from('app_config')
        .select('app_url')
        .single()
    
    if (error) throw error
    return data.app_url
}

async function showURL(url) {
    if (url === 'APP_URL') {
        url = await getAppURL()
    }
    content.innerHTML = `<iframe src="${url}"></iframe>`
}

async function setJWTCookie(payload) {
    const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(JWT_SECRET)
    
    document.cookie = `auth_token=${jwt}; max-age=86400; path=/; secure; samesite=strict`
}

async function getJWTCookie() {
    const authCookie = document.cookie.split(';').find(c => c.trim().startsWith('auth_token='))
    if (authCookie) {
        const token = authCookie.split('=')[1]
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET)
            return payload
        } catch (error) {
            console.error('Invalid token:', error)
            return null
        }
    }
    return null
}

function removeTokenFromURL() {
    const url = new URL(window.location)
    url.hash = ''
    window.history.replaceState({}, document.title, url.toString())
}

async function checkUserStatus() {
    try {
        let jwtPayload = await getJWTCookie()

        if (jwtPayload) {
            if (jwtPayload.authenticated && jwtPayload.valid) {
                await showURL('APP_URL')
            } else if (jwtPayload.authenticated && !jwtPayload.valid) {
                showURL(WAITLIST_URL)
            } else {
                showURL(LOGIN_URL)
            }
            removeTokenFromURL()
            return
        }

        const token = new URLSearchParams(window.location.hash.slice(1)).get('access_token')

        if (!token) {
            showURL(LOGIN_URL)
            return
        }

        const userEmail = JSON.parse(atob(token.split('.')[1])).email

        if (!userEmail) {
            showURL(LOGIN_URL)
            removeTokenFromURL()
            return
        }

        const { data: email_allowlist, error } = await supabase
            .from('email_allowlist')
            .select('email')
            .eq('email', userEmail)

        if (error) throw error

        const userAuthenticated = true
        const userValid = email_allowlist.length > 0

        await setJWTCookie({ authenticated: userAuthenticated, valid: userValid })

        if (userAuthenticated && userValid) {
            await showURL('APP_URL')
        } else if (userAuthenticated && !userValid) {
            showURL(WAITLIST_URL)
        } else {
            showURL(LOGIN_URL)
        }

        removeTokenFromURL()
    } catch (error) {
        console.error('Error:', error.message)
        showURL(LOGIN_URL)
        removeTokenFromURL()
    }
}

checkUserStatus()

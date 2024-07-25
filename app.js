async function fetchMessage() {
    const response = await fetch('https://api.example.com/message', {
        headers: {
            'Authorization': `Bearer ${API_KEY}`
        }
    });
    const data = await response.json();
    document.getElementById('message').textContent = data.message;
}

fetchMessage();

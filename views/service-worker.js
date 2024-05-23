self.addEventListener('install', event => {
    console.log('Service Worker installed.');
    event.waitUntil(self.skipWaiting()); // Activate worker immediately
});

self.addEventListener('activate', event => {
    console.log('Service Worker activated.');
    event.waitUntil(self.clients.claim()); // Become available to all pages
});

self.addEventListener('fetch', event => {
    // Intercept fetch requests and store notification requests locally
    if (event.request.url.includes('/send-notification')) {
        event.respondWith(storeNotificationRequest(event.request));
    }
});

self.addEventListener('sync', event => {
    // When online, send any queued notifications
    if (event.tag === 'send-notifications') {
        event.waitUntil(sendQueuedNotifications());
    }
});

// Push event to handle background notifications
self.addEventListener('push', event => {
    const data = event.data.json();
    console.log('Push event received:', data);
    const title = data.notification.title;
    const options = {
        body: data.notification.body,
        icon: data.notification.icon || 'logo.png', // Default icon
        data: data
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

function storeNotificationRequest(request) {
    notificationQueue.push(request);
    console.log('Notification request stored:', request.url);
    return new Response('', { status: 200 });
}

async function sendQueuedNotifications() {
    // Send all queued notifications when the device comes online
    console.log('Device is online. Sending queued notifications...');
    while (notificationQueue.length > 0) {
        const request = notificationQueue.shift();
        console.log('Sending queued notification:', request.url);
        try {
            const response = await fetch(request);
            console.log('Notification sent:', response);
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }
}

function scheduleNotifications() {
    setInterval(() => {
        if (navigator.onLine) {
            console.log('Sending notification.');
            sendNotification();
        } else {
            console.log('Waiting to come online.');
            self.addEventListener('online', handleOnlineStatus);
        }
    }, 60000); // Every minute
}

function handleOnlineStatus() {
    console.log('Came online, sending queued notifications.');
    sendQueuedNotifications();
}

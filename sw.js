
self.addEventListener('push' , (event)=>{
    const notif = event.json().notification;
    self.registration.showNotification(notif.title , {
        body:notif.body,
        icon:notif.image
    });
});
self.addEventListener("notificationclick" , (event)=>{
    event.waitUntilClients.openwindow(event.notification.data.url) ;
}) ;
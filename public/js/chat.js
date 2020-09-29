const socket = io()
// this will allow us to both send and receive events

// server(emit) => client(receive) => acknowledgement => server

// client(emit) => server(receive) => acknowledgement => client


// Elements
const $messageForm = document.querySelector("#message-form");
const $messageFormInput = $messageForm.querySelector('input');
const $messageFormButton = $messageForm.querySelector('button');
const $sendLocationButton = document.querySelector("#send-location");
const $messages = document.querySelector('#messages');


//Templates
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

//Options
const {username, room} = Qs.parse(location.search, { ignoreQueryPrefix: true})

const autoScroll = () => {
  // New message element
  const $newMessage = $messages.lastElementChild

  // Height of the new message
  const newMessageStyle = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyle.marginBottom)
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  // Visible height
  const visibleHeight = $messages.offsetHeight;

  // Height of messages container
  const containerHeight = $messages.scrollHeight;

  // How far have I scrolled
  const scrollOffset = $messages.scrollTop + visibleHeight;

  if(containerHeight - newMessageHeight <= scrollOffset){
    $messages.scrollTop = $messages.scrollHeight
  }

}

socket.on('message', (message)=> {
  const html = Mustache.render(messageTemplate, {
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format('h:m a')
  });
  $messages.insertAdjacentHTML('beforeend', html);
  autoScroll()
})

socket.on('locationMessage', (location)=> {
  const html = Mustache.render(locationMessageTemplate, {
    url: location.url,
    createdAt: moment(location.createdAt).format("h:m a"),
    username: location.username
  });
  $messages.insertAdjacentHTML('beforeend',html);
  autoScroll()
})

socket.on('roomData', ({ room, users })=> {
  const html = Mustache.render(sidebarTemplate, {
    room, users
  });
  document.querySelector('#sidebar').innerHTML = html
})

$messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
 //this will disable the form once clicked
  $messageFormButton.setAttribute('disabled', 'disabled');

  const message = e.target.elements.message.value;
  socket.emit("sendMessage", message, (error) => {
    $messageFormButton.removeAttribute('disabled');
    $messageFormInput.value = '';
    $messageFormInput.focus()
    // will run when acknowledged
    if (error) {
      return console.log(error);
    }
    console.log("Message Delivered!");
  });
});

$sendLocationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    return alert("Geolocation is not supported by your browser.");
  }

  $sendLocationButton.setAttribute('disabled', 'disabled');

  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit(
      "sendLocation",
      {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      () => {
        $sendLocationButton.removeAttribute('disabled')
        console.log("Location shared!");
      }
    );
  });
});

socket.emit('join', { username, room }, (error)=> {
  if(error){
    alert(error);
    location.href = '/'
  }
})
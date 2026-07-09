/* ================================================================
   THE VAULT — LIBRARY
   To add a book:
   1. Upload the audio to archive.org and copy the direct file link.
   2. Save a portrait cover image (2:3 ratio) into vault/covers/.
   3. Add an entry below. `id` must be unique and never change —
      it is the key your progress and notes are stored under.
   Optional fields: trimStart (seconds to skip at the start),
   chapters: [{t: seconds, title: 'Chapter name'}, ...]
================================================================ */
window.VAULT_BOOKS = [
  {
    id: 'XamuvhQibBs',
    title: 'Up From Slavery',
    author: 'Booker T. Washington',
    accent: '#eab535',
    grad: 'linear-gradient(150deg,#c98b1e,#5c3c08 60%,#241503)',
    type: 'audiobooks',
    categories: ['self-help','other'],
    cover: 'covers/up-from-slavery.jpg',
    src: 'https://ia800108.us.archive.org/0/items/up-from-slavery-an-autobiography-version-2-by-booker-t.-washington-full-audio-bo/Up%20From%20Slavery%20An%20Autobiography%20%28version%202%29%20by%20Booker%20T.%20WASHINGTON%20%20Full%20Audio%20Book-1280x720-avc1-mp4a.mp4',
    description: "The autobiography of Booker T. Washington, one of the most inspiring stories of rising from slavery to becoming one of the most influential leaders in American history.",
  },
  {
    id: 'BZGnJImTlfw',
    title: 'Outwitting the Devil',
    author: 'Napoleon Hill',
    accent: '#f0803c',
    grad: 'linear-gradient(150deg,#9c4c16,#472208 60%,#1c0d02)',
    type: 'audiobooks',
    categories: ['self-help','other'],
    cover: 'covers/outwitting-the-devil.jpg',
    src: 'https://archive.org/download/outwitting-the-devil-napoleon-hill-the-audio-book-that-will-open-your-eyes/Outwitting%20The%20Devil%20Napoleon%20Hill%20%28The%20AudioBook%20That%20Will%20Open%20Your%20Eyes%29.mp3',
    trimStart: 6,
    description: "Napoleon Hill's long-suppressed masterpiece: a revealing interview with the Devil himself, exposing the forces of fear, procrastination, and drifting that keep people from living freely. Written in 1938, it wasn't published until 2011.",
  },
  {
    id: 'd9zUVFzPtJ4',
    title: 'How to Win Friends and Influence People',
    author: 'Dale Carnegie',
    accent: '#e8524a',
    grad: 'linear-gradient(150deg,#a32e2e,#4a1414 60%,#1c0707)',
    type: 'audiobooks',
    categories: ['business','self-help'],
    cover: 'covers/how-to-win-friends.jpg',
    src: 'https://ia601505.us.archive.org/7/items/how-to-win-friends-and-influence-people-by-dale-carnegie-audiobook/How%20To%20Win%20Friends%20And%20Influence%20People%20By%20Dale%20Carnegie%20%28Audiobook%29.mp3',
    description: "Dale Carnegie's timeless classic on building meaningful relationships: how to make people like you, win them to your way of thinking, and become a more effective leader through empathy, listening, and genuine appreciation.",
  },
  {
    id: 'dIgz7DKWx5s',
    title: 'Think and Grow Rich',
    author: 'Napoleon Hill',
    accent: '#8fbf7f',
    grad: 'linear-gradient(150deg,#3f6b33,#1d3317 60%,#0a1407)',
    type: 'audiobooks',
    categories: ['business','self-help'],
    cover: 'covers/think-and-grow-rich.jpg',
    src: 'https://archive.org/download/think-and-grow-rich-1937-1st-edition-by-napoleon-hill/Think%20And%20Grow%20Rich%21%20%281937%20-%201st%20Edition%29%20by%20Napoleon%20Hill.mp3',
    description: "Napoleon Hill's classic on the mindset and principles behind achieving wealth and success, based on interviews with hundreds of self-made millionaires.",
  },
  {
    id: 'wp7Lz1svVro',
    title: 'Rich Dad Poor Dad',
    author: 'Robert Kiyosaki',
    accent: '#b98cf0',
    grad: 'linear-gradient(150deg,#5e3c96,#2c1b49 60%,#120a1e)',
    type: 'audiobooks',
    categories: ['business','self-help'],
    cover: 'covers/rich-dad-poor-dad.jpg',
    src: 'https://archive.org/download/rich-dad-poor-dad-complete-audio-book-robert-kiyosaki-poor-dad-rich-dad-audiobook-2026/Rich%20Dad%20Poor%20Dad%20Complete%20audio%20book%20Robert%20kiyosaki%20%20Poor%20Dad%20Rich%20Dad%20Audiobook%202026.mp3',
    description: "Robert Kiyosaki's landmark book on financial education: why the rich don't work for money, the power of assets over liabilities, and how to build wealth.",
  },
];

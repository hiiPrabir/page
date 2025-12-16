const API_KEY = "PASTE_YOUR_YOUTUBE_API_KEY_HERE";
const CHANNEL_ID = "UCeGw4rSHuOlW0x2R52auMPg";
const perPage = 9;
let allVideos = [];
let currentPage = 1;
let activeTag = null;

const $ = s => document.querySelector(s);

function youtubeThumb(id){
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}
function youtubeWatch(id){
  return `https://www.youtube.com/watch?v=${id}`;
}
function youtubeEmbed(id){
  return `https://www.youtube.com/embed/${id}?autoplay=1`;
}

async function fetchJSON(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error("API error");
  return r.json();
}

async function getUploadsPlaylistId(){
  const url =
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`;
  const data = await fetchJSON(url);
  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

async function fetchUploads(pid){
  const vids = [];
  let next = "";
  do {
    const url =
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${pid}&key=${API_KEY}&pageToken=${next}`;
    const d = await fetchJSON(url);
    d.items.forEach(v => {
      vids.push({
        id: v.snippet.resourceId.videoId,
        title: v.snippet.title,
        date: v.snippet.publishedAt.slice(0,10),
        description: v.snippet.description
      });
    });
    next = d.nextPageToken || "";
  } while(next);
  return vids;
}

function render(){
  const grid = $("#grid");
  grid.innerHTML = "";

  if(allVideos.length === 0){
    $("#emptyState").classList.remove("hidden");
    return;
  }

  $("#emptyState").classList.add("hidden");

  allVideos.slice(0, perPage).forEach(v => {
    grid.innerHTML += `
      <div class="border rounded-xl overflow-hidden fade-in">
        <img src="${youtubeThumb(v.id)}" class="w-full cursor-pointer"
             onclick="openModal('${v.id}','${v.title.replace(/'/g,"")}')">
        <div class="p-3">
          <h3 class="font-semibold line-clamp-2">${v.title}</h3>
          <p class="text-xs text-gray-500">${v.date}</p>
          <a href="${youtubeWatch(v.id)}" target="_blank" class="text-sm underline">
            Watch on YouTube
          </a>
        </div>
      </div>
    `;
  });
}

window.openModal = function(id,title){
  $("#player").src = youtubeEmbed(id);
  $("#modalTitle").textContent = title;
  $("#openOnYT").href = youtubeWatch(id);
  $("#modal").classList.remove("hidden");
  $("#modal").classList.add("flex");
}

$("#closeModal").onclick = () => {
  $("#player").src = "";
  $("#modal").classList.add("hidden");
};

async function init(){
  $("#year").textContent = new Date().getFullYear();
  const pid = await getUploadsPlaylistId();
  allVideos = await fetchUploads(pid);
  render();
}

document.addEventListener("DOMContentLoaded", init);

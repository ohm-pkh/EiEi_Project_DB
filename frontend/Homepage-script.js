let overlay;
const ScrollContainer = document.querySelector('.movie-scoller-container');
const movies = ScrollContainer.querySelectorAll('.movie-scoller-container .movie');
let onchanging = 0;

ScrollContainer.addEventListener('scroll', () => {
  const focusEl = ScrollContainer.querySelector('.onFocus');
  if (!focusEl) return;

  const containerRect = ScrollContainer.getBoundingClientRect();
  const focusRect = focusEl.getBoundingClientRect();

  const isHalfOutLeft = focusRect.left + (focusRect.width / 8) < containerRect.left;
  const isHalfOutRight = focusRect.right - (focusRect.width / 10) > containerRect.right;

  const next = focusEl.nextElementSibling;
  const prev = focusEl.previousElementSibling;

  const container = document.querySelector('.head-container');
  if (isHalfOutLeft && next && onchanging == 0) {
    focusEl.classList.remove('onFocus');
    next.classList.add('onFocus');
    const bgImg = next.getAttribute('bg_img');
    container.style.backgroundImage = `url("http://localhost:8000${bgImg}")`;
  } else if (isHalfOutRight && prev && ScrollContainer.scrollLeft + ScrollContainer.clientWidth < ScrollContainer.scrollWidth && onchanging == 0) {
    focusEl.classList.remove('onFocus');
    prev.classList.add('onFocus');
    const bgImg = prev.getAttribute('bg_img');
    container.style.backgroundImage = `url("http://localhost:8000${bgImg}")`;
  }
});



function openOverlay(id){
  const overlayALL = document.querySelectorAll('#overlay');
  overlayALL.forEach(item =>{
    item.style.display='none';
  });
  overlay = document.querySelector('.'+id);
  console.log(id);
  overlay.style.display = 'flex';
}

function closeOverlay(e){
  console.log(e);
  if (e.target === overlay) {
        overlay.style.display = 'none';
      }
}
function colseOverlayBybutton(el){
  el.style.display ='none';
}

function  goFocus(item){
    const container = document.querySelector('.head-container');
    console.log(movie_data);
    onchanging = 1;
    

    const oldFocus = ScrollContainer.querySelector('.onFocus'); 
    if (oldFocus) oldFocus.classList.remove('onFocus');

    item.classList.add('onFocus');
    const offset = item.offsetLeft - (ScrollContainer.clientWidth / 6) + (item.clientWidth / 2);
    ScrollContainer.scrollTo({ left: offset, behavior: 'smooth' });
    const bgImg = item.getAttribute('bg_img');
    container.style.backgroundImage = `url("http://localhost:8000${bgImg}")`;
    setTimeout(() => {
      onchanging = 0;
    }, 500);
}


function seemore(container){
    const Contentcontainer = document.querySelectorAll(".main-container .Content-container");
    let display_type,new_height,locat,letter;
    if(container.style.height !== 'fit-content'){
        display_type = 'none';
        new_height = 'fit-content';
        locat = document.getElementById("Recommend-movie-container").offsetTop;
        letter = 'see less';
    }else{
        display_type = 'flex';
        new_height = '650px';
        locat = container.offsetTop;
        letter = 'see more';
    }
    Contentcontainer.forEach(Con => {
        if(Con !== container){
            Con.style.display = display_type;
        }
    })
    container.style.height = new_height;
    container.querySelector('.see-more div').innerText = letter;
    locat = locat-100;
    window.scrollTo({ top: 0});
    window.scrollTo({ top: locat, behavior: 'smooth'});
}
function goBooking(id) {
  window.location.href = `Choose_th.html?id=${id}`;
} 



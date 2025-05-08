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

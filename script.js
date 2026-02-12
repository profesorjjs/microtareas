const CBQD_ITEMS = [
  { n: 1, t: "¿Has compartido imágenes o fotos a través de tus redes sociales (Facebook, Instagram, etcétera)?" },
  { n: 2, t: "¿Has hecho un vídeo sobre algo personal y lo has publicado en YouTube?" },
  { n: 3, t: "¿Has hecho publicaciones en tu blog sobre tus amigos y familiares?" },
  { n: 4, t: "¿Has hecho publicaciones en tu blog sobre algún pasatiempo o actividad de ocio no relacionada con la escuela?" },
  { n: 5, t: "¿Has hecho presentaciones usando PowerPoint, Prezi, KeyNote u otros?" },
  { n: 6, t: "¿Has hecho vídeos o películas usando alguna aplicación de vídeo?" },
  { n: 7, t: "¿Has publicado contenido creativo en las redes sociales?" },
  { n: 8, t: "¿Has hecho un vídeo musical sobre ti o tu pandilla de amigos?" },
  { n: 9, t: "¿Has contribuido en una página web (fansite) sobre tus programas de televisión o videojuegos favoritos?" },
  { n: 10, t: "¿Has creado arte de fanáticos (fanart)?" },
  { n: 11, t: "¿Has creado o desarrollado una aplicación para un dispositivo móvil?" },
  { n: 12, t: "¿Has creado contenido nuevo para videojuegos?" },
  { n: 13, t: "¿Has sido disyóquey para una emisora de radio o evento local?" },
  { n: 14, t: "¿Has vendido algo que hayas hecho en un sitio web?" },
  { n: 15, t: "¿Has ganado un premio por realizar una fotografía digital?" },
  { n: 16, t: "¿Has desarrollado un blog o sitio web para una clase o proyecto escolar?" },
  { n: 17, t: "¿Has participado en un club relacionado con la tecnología después de la escuela?" },
  { n: 18, t: "¿Has creado algo usando una impresora en 3D?" },
  { n: 19, t: "¿Has iniciado un grupo en redes sociales para promocionar una actividad u organización?" },
  { n: 20, t: "¿Has creado un proyecto multimedia para una clase?" },
  { n: 21, t: "¿Has creado un podcast?" },
  { n: 22, t: "¿Has hecho un vídeo para un proyecto de clase?" },
  { n: 23, t: "¿Has enviado algo que escribiste a un concurso online, digital o de radio?" },
  { n: 24, t: "¿Has comenzado un nuevo blog?" },
  { n: 25, t: "¿Se te ha pedido que contribuyas en un blog o en alguna de sus secciones?" },
  { n: 26, t: "¿Has hecho animación digital usando herramientas web?" },
  { n: 27, t: "¿Has hecho un mashup de música y lo has publicado online?" },
  { n: 28, t: "¿Has enviado tu arte digital a una comunidad creativa online?" },
  { n: 29, t: "¿Has ganado un concurso de arte digital?" },
  { n: 30, t: "¿Has recibido clases de arte digital (Photoshop, animación 3D, etc.)?" },
  { n: 31, t: "¿Has ganado dinero por publicidad en redes sociales o YouTube?" },
  { n: 32, t: "¿Has recaudado dinero para un proyecto usando crowdfunding?" },
  { n: 33, t: "¿Has creado tu propio blog de vídeos o webshow?" }
];

document.getElementById("login-button").addEventListener("click", () => {
  document.getElementById("login-section").classList.add("hidden");
  document.getElementById("upload-section").classList.remove("hidden");
  renderCBQD();
});

function renderCBQD() {
  const host = document.getElementById("cbqd-items");
  host.innerHTML = "";
  CBQD_ITEMS.forEach(item => {
    const div = document.createElement("div");
    div.className = "cbqd-item";
    div.innerHTML = `<p>${item.n}. ${item.t}</p>`;
    const scale = document.createElement("div");
    scale.className = "cbqd-scale";
    for (let i = 1; i <= 5; i++) {
      scale.innerHTML += `<label><input type='radio' name='cbqd_${item.n}' value='${i}' required> ${i}</label>`;
    }
    div.appendChild(scale);
    host.appendChild(div);
  });
}

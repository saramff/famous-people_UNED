// Catálogo de estímulos. Cada fila es: [archivo, objeto real, objeto falso].
// Los objetos reales se han comprobado visualmente en las 48 imágenes.
// Los 48 objetos falsos son distintos y ninguno es un objeto real del catálogo.
export const IMAGE_REVISION = '8352a09db137e9734a5e7f91238595dc6573e7fc';
const IMAGE_ROOT = `https://raw.githubusercontent.com/saramff/famosos_img/${IMAGE_REVISION}`;

export const imageUrl = (folder, name) => `${IMAGE_ROOT}/${folder}/${encodeURIComponent(name)}.png`;

const catalog = [
  ['Aitana', 'un globo', 'un lápiz'],
  ['Albert Einstein', 'una regla', 'un imán'],
  ['Alberto Chicote', 'una sartén', 'un colador'],
  ['Alejandro Sanz', 'una guitarra', 'una armónica'],
  ['Ana Rosa Quintana', 'un espejo', 'un delantal'],
  ['Andrés Iniesta', 'unos auriculares', 'un silbato'],
  ['Angela Merkel', 'hilo', 'una grapadora'],
  ['Antonio Banderas', 'perfume', 'una máscara'],
  ['Bertín Osborne', 'un secador', 'un tenedor'],
  ['Beyoncé', 'un disco', 'una percha'],
  ['Blanca Suárez', 'un plato', 'una galleta'],
  ['Carlos Alcaraz', 'un trofeo', 'una raqueta'],
  ['Carlos Sobera', 'un regalo', 'un dado'],
  ['Carmen Machi', 'una sombrilla', 'un rodillo'],
  ['Chiquito de la Calzada', 'un martillo', 'una peonza'],
  ['Cristiano Ronaldo', 'una piña', 'una mancuerna'],
  ['Dani Rovira', 'una maceta', 'una cometa'],
  ['Fernando Tejero', 'una taza', 'un destornillador'],
  ['Freddie Mercury', 'una caja', 'una sandía'],
  ['Frida Kahlo', 'un violín', 'unas tijeras'],
  ['Jackie Chan', 'una espada', 'un ladrillo'],
  ['Jordi Hurtado', 'una ensalada', 'un candado'],
  ['Jordi Évole', 'un despertador', 'un trípode'],
  ['José María Aznar', 'una bombilla', 'un rastrillo'],
  ['José Mota', 'un megáfono', 'un rallador'],
  ['Juan y Medio', 'un pastel', 'una tostadora'],
  ['Keanu Reeves', 'un sándwich', 'una linterna'],
  ['Lamine Yamal', 'una toalla', 'un plátano'],
  ['Laura Pausini', 'una naranja', 'un acordeón'],
  ['Leonardo DiCaprio', 'una hucha', 'una concha'],
  ['Lionel Messi', 'un cono', 'un peluche'],
  ['Malú', 'una pluma', 'una flauta'],
  ['Matías Prats', 'un ordenador', 'un sobre'],
  ['Obama', 'un libro', 'un sello'],
  ['Paz Padilla', 'un cofre', 'una cesta'],
  ['Penélope Cruz', 'chocolate', 'una berenjena'],
  ['Rey Felipe', 'un paraguas', 'una pala'],
  ['Rihanna', 'unos prismáticos', 'unas uvas'],
  ['Robin Williams', 'una probeta', 'una manzana'],
  ['Roger Federer', 'un zumo', 'una bicicleta'],
  ['Rosalía', 'un cojín', 'unas castañuelas'],
  ['Santiago Segura', 'una gorra', 'una batidora'],
  ['Shakira', 'una copa', 'unas maracas'],
  ['Tom Cruise', 'un maletín', 'un extintor'],
  ['Tom Holland', 'un billete', 'un patín'],
  ['Vladímir Putin', 'una campana', 'un mapa'],
  ['Zendaya', 'un cubo', 'una esponja'],
  ['Úrsula Corberó', 'un jarrón', 'una plancha'],
];

export const celebrities = catalog.map(([file, object, falseObject], index) => ({
  id: `E${String(index + 1).padStart(2, '0')}`,
  index,
  name: file === 'Obama' ? 'Barack Obama' : file,
  file: `${file}.png`,
  image: imageUrl('Experimental', file),
  object,
  falseObject,
}));

// El mismo índice siempre corresponde al mismo famoso: elegir V excluye su F.
export const trueSentences = celebrities.map(person => `${person.name} tenía ${person.object}.`);
export const falseSentences = celebrities.map(person => `${person.name} tenía ${person.falseObject}.`);

const newNames = [
  'Amancio Ortega', 'Ana Peleteiro', 'Angelina Jolie', 'Antonio Resines',
  'Arguiñano', 'Arnold Schwarzenegger', 'Arturo Pérez-Reverte', 'Belén Esteban',
  'Brad Pitt', 'Chenoa', 'Cristina Pedroche', 'Dani Martín',
  'David Bisbal', 'David Broncano', 'Donald Trump', 'Emma Stone',
  'Emma Watson', 'Ester Expósito', 'Fernando Alonso', 'George Clooney',
  'Gerard Piqué', 'Iker Casillas', 'Isabel Díaz Ayuso', 'Isabel Pantoja',
  'Jennifer Aniston', 'Jim Carrey', 'John Travolta', 'Johnny Depp',
  'Jorge Javier Vázquez', 'Marilyn Monroe', 'Mario Casas', 'Mbappé',
  'Michael Jackson', 'Morgan Freeman', 'Pablo Motos', 'Paco León',
  'Papa Francisco', 'Pau Gasol', 'Picasso', 'Pilar Rubio',
  'Princesa Letizia', 'Rafa Nadal', 'Ramón García', 'Scarlett Johansson',
  'Sergio Ramos', 'Taylor Swift', 'Terelu Campos', 'Will Smith',
];

export const newCelebrities = newNames.map((name, index) => ({
  id: `N${String(index + 1).padStart(2, '0')}`,
  name,
  file: `${name}.png`,
  image: imageUrl('Reconocimiento', name),
}));

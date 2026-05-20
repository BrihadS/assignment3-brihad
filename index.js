//DIFFICULTY
const DIFFICULTY = 
{
  easy:   {pairs: 3,  time: 60},
  medium: {pairs: 6,  time: 90},
  hard:   {pairs: 10, time: 120}
};

//STATE
let firstCard     = null;
let secondCard    = null;
let lockBoard     = false;
let clicks        = 0;
let matchedPairs  = 0;
let totalPairs    = 0;
let timeLeft      = 0;
let timerInterval = null;
let gameActive    = false;
let currentDiff   = "easy";
let powerupUsed   = false;

//POKEMON API
async function fetchRandomPokemon(count)
{
  //Get full list
  const listRes  = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1025");
  const listData = await listRes.json();
  const all      = listData.results;

  //Shuffle and pick (count) unique Pokemon
  const shuffled = all.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  //Fetch image for each
  const pokemon = await Promise.all(selected.map(async (p) =>
  {
    const res  = await fetch(p.url);
    const data = await res.json();
    return {
      name: data.name,
      img:  data.sprites.other["official-artwork"].front_default
    };
  }));

  return pokemon;
}

//BUILD GRID
function buildGrid(pokemonList)
{
  const grid = document.getElementById("game_grid");
  grid.innerHTML = "";

  //Duplicate each pokemon to make pairs, then shuffle
  const cards = [...pokemonList, ...pokemonList]
    .sort(() => Math.random() - 0.5);

  cards.forEach((p) =>
  {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.name = p.name;
    card.innerHTML = `
      <div class="card-inner">
        <div class="front_face">
          <img src="${p.img}" alt="${p.name}">
        </div>
        <div class="back_face">
          <img src="back.webp" alt="card back">
        </div>
      </div>
    `;
    card.addEventListener("click", onCardClick);
    grid.appendChild(card);
  });
}

//CARD CLICK LOGIC
function onCardClick()
{
  if (!gameActive) return;
  if (lockBoard) return;
  const card = this;
  if (card.classList.contains("flip")) return;    //already flipped
  if (card.classList.contains("matched")) return; //already matched

  card.classList.add("flip");
  clicks++;
  updateStatus();

  if (!firstCard)
  {
    firstCard = card;
    return;
  }

  secondCard = card;
  lockBoard  = true;

  if (firstCard.dataset.name === secondCard.dataset.name)
  {
    //matched
    firstCard.classList.add("matched");
    firstCard.removeEventListener("click", onCardClick);
    secondCard.classList.add("matched");
    secondCard.removeEventListener("click", onCardClick);
    matchedPairs++;
    updateStatus();
    reset2Cards();

    if (matchedPairs === totalPairs)
    {
      endGame(true);
    }
  }
  else
  {
    //No match (flip back after delay)
    const c1 = firstCard;
    const c2 = secondCard;
    setTimeout(() =>
    {
      c1.classList.remove("flip");
      c2.classList.remove("flip");
      reset2Cards();
    }, 1000);
  }
}

function reset2Cards()
{
  firstCard = null;
  secondCard = null;
  lockBoard  = false;
}

//TIMER
function startTimer()
{
  clearInterval(timerInterval);
  timerInterval = setInterval(() =>
  {
    timeLeft--;
    updateStatus();
    if (timeLeft <= 0)
    {
      clearInterval(timerInterval);
      endGame(false);
    }
  }, 1000);
}

//STATUS
function updateStatus()
{
  const left = totalPairs - matchedPairs;
  document.getElementById("timer-display").textContent   = timeLeft > 0 ? timeLeft + "s" : "0s";
  document.getElementById("clicks-display").textContent  = clicks;
  document.getElementById("matched-display").textContent = matchedPairs;
  document.getElementById("left-display").textContent    = left;
  document.getElementById("total-display").textContent   = totalPairs;
}

//END GAME
function endGame(won)
{
  gameActive = false;
  clearInterval(timerInterval);
  document.querySelectorAll(".card").forEach(c => c.removeEventListener("click", onCardClick));
  lockBoard = true;

  const title = document.getElementById("overlay-title");
  if (won)
  {
    title.textContent = "You Win! :D";
    title.className = "win";
    document.getElementById("overlay-msg").textContent = `You matched all ${totalPairs} pairs with ${clicks} clicks!`;
  }
  else
  {
    title.textContent = "Game Over :(";
    title.className = "lose";
    const left = totalPairs - matchedPairs;
    document.getElementById("overlay-msg").textContent = `Time's up! You had ${left} pair(s) left to find.`;
  }
  document.getElementById("overlay").classList.remove("hidden");
}

//START GAME
async function startGame()
{
  clearInterval(timerInterval);
  resetState();

  const config = DIFFICULTY[currentDiff];
  totalPairs   = config.pairs;
  timeLeft     = config.time;
  powerupUsed  = false;

  const powerupBtn = document.getElementById("powerup-btn");
  powerupBtn.disabled = false;
  powerupBtn.textContent = "Peek!";

  document.getElementById("overlay").classList.add("hidden");
  document.getElementById("loading").classList.remove("hidden");
  document.getElementById("game_grid").classList.add("hidden");
  updateStatus();

  try
  {
    const pokemon = await fetchRandomPokemon(totalPairs);
    buildGrid(pokemon);
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("game_grid").classList.remove("hidden");
    gameActive = true;
    startTimer();
  }
  catch (e)
  {
    document.getElementById("loading").classList.add("hidden");
    alert("Failed to load Pokémon. Please check your connection and try again.");
  }
}

function resetState()
{
  firstCard    = null;
  secondCard   = null;
  lockBoard    = false;
  clicks       = 0;
  matchedPairs = 0;
  totalPairs   = 0;
  gameActive   = false;
  updateStatus();
}

//POWER-UP
function triggerPowerup()
{
  if (!gameActive || powerupUsed) return;
  powerupUsed = true;
  const powerupBtn = document.getElementById("powerup-btn");
  powerupBtn.disabled = true;
  powerupBtn.textContent = "Used!";

  // Flip all unmatched cards face-up temporarily
  const unmatched = document.querySelectorAll(".card:not(.matched):not(.flip)");
  unmatched.forEach(c => c.classList.add("peeking"));
  lockBoard = true;

  setTimeout(() =>
  {
    unmatched.forEach(c => c.classList.remove("peeking"));
    lockBoard = false;
  }, 2000);
}

//THEME
function toggleTheme()
{
  const body = document.body;
  if (body.classList.contains("light"))
  {
    body.classList.replace("light", "dark");
    document.getElementById("theme-btn").textContent = "☀️ Light";
  }
  else
  {
    body.classList.replace("dark", "light");
    document.getElementById("theme-btn").textContent = "🌙 Dark";
  }
}

//INITIALIZATION
document.addEventListener("DOMContentLoaded", () =>
{
  // Difficulty buttons
  document.querySelectorAll(".diff-btn").forEach(btn =>
  {
    btn.addEventListener("click", () =>
    {
      document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentDiff = btn.dataset.diff;
    });
  });

  //Start
  document.getElementById("start-btn").addEventListener("click", startGame);

  //Reset
  document.getElementById("reset-btn").addEventListener("click", startGame);

  //Overlay play again
  document.getElementById("overlay-btn").addEventListener("click", startGame);

  //Theme
  document.getElementById("theme-btn").addEventListener("click", toggleTheme);

  //Power-up
  document.getElementById("powerup-btn").addEventListener("click", triggerPowerup);

  //Init display
  updateStatus();
});
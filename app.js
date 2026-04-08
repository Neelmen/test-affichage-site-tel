const SUPABASE_URL = "https://oaxpofkmtrudriyrbxvy.supabase.co";
const BUCKET_NAME = "dishes-images";
const client = supabase.createClient(SUPABASE_URL, "sb_publishable_W0bTuLBKIo_-tSVK_XfKYg_LScZ_5EY");

const cache = {};
let currentCategory = null;

function getImageUrlFromPath(imagePath) {
    if (!imagePath) return "";
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${imagePath}`;
}

// --- INITIALISATION DU MENU ---
function initMainMenu() {
    const nav = document.getElementById("navigation");
    const categories = ["entree", "plat", "dessert", "boisson", "accompagnement"];
    const labels = { entree: "ENTRÉES", plat: "PLATS", dessert: "DESSERTS", boisson: "BOISSONS", accompagnement: "ACCOMPAGNEMENTS" };

    nav.innerHTML = "";
    categories.forEach(cat => {
        const btn = document.createElement("button");
        btn.textContent = labels[cat] || cat.toUpperCase();
        btn.addEventListener("click", () => showCategory(cat));
        nav.appendChild(btn);
    });
}

// --- AFFICHAGE CATÉGORIE ---
async function showCategory(category) {
    const container = document.getElementById("menu");
    if (currentCategory === category) {
        currentCategory = null;
        container.innerHTML = "";
        document.getElementById("back-button").classList.add("hidden");
        return;
    }

    currentCategory = category;
    container.innerHTML = "<p>Chargement...</p>";
    document.getElementById("back-button").classList.remove("hidden");

    // Mise à jour visuelle des boutons
    document.querySelectorAll("#navigation button").forEach(btn => {
        btn.classList.toggle("active", btn.textContent.toLowerCase().includes(category.substring(0,3)));
    });

    if (cache[category]) {
        displayCategory(cache[category]);
        return;
    }

    const { data, error } = await client.from("dishes").select("*").eq("category", category).eq("available", true);
    if (error) { container.innerHTML = "Erreur de chargement."; return; }

    const grouped = data.reduce((acc, dish) => {
        const sub = dish.subcategory || "_no_sub";
        if (!acc[sub]) acc[sub] = [];
        acc[sub].push(dish);
        return acc;
    }, {});

    cache[category] = grouped;
    displayCategory(grouped);
}

// --- RENDU DES CARTES ---
function displayCategory(grouped) {
    const container = document.getElementById("menu");
    container.innerHTML = "";

    for (const [sub, dishes] of Object.entries(grouped)) {
        if (sub !== "_no_sub") {
            const h2 = document.createElement("h2");
            h2.textContent = sub;
            container.appendChild(h2);
        }

        const groupDiv = document.createElement("div");
        groupDiv.className = "category-group";

        dishes.forEach(dish => {
            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
                <img src="${getImageUrlFromPath(dish.image_path)}" alt="${dish.name}">
                <div class="card-content">
                    <h3>${dish.name}</h3>
                    <p>${dish.price} €</p>
                </div>
            `;
            card.addEventListener("click", () => showDetail(dish));
            groupDiv.appendChild(card);
        });
        container.appendChild(groupDiv);
    }
    container.scrollIntoView({ behavior: "smooth" });
}

// --- ZOOM DU PLAT (FONCTION CORRIGÉE) ---
function showDetail(dish) {
    const detail = document.getElementById("dish-detail");
    detail.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // Empêche le scroll derrière

    detail.innerHTML = `
        <div class="zoom-container">
            <div class="card zoom-card">
                <img src="${getImageUrlFromPath(dish.image_path)}" alt="${dish.name}">
                <h3>${dish.name}</h3>
                <p class="price">${dish.price} €</p>
                ${dish.description ? `<p class="desc"><b>Description :</b> ${dish.description}</p>` : ''}
                ${dish.ingredients ? `<p class="ing"><b>Ingrédients :</b> ${dish.ingredients}</p>` : ''}
                <button class="close-zoom">Fermer</button>
            </div>
        </div>
    `;

    // Fermer au clic sur le bouton ou sur le fond
    detail.onclick = (e) => {
        if (e.target.id === "dish-detail" || e.target.className === "zoom-container" || e.target.className === "close-zoom") {
            closeDetail();
        }
    };
}

function closeDetail() {
    const detail = document.getElementById("dish-detail");
    detail.classList.add("hidden");
    document.body.style.overflow = "auto";
}

// --- BOUTON RETOUR ---
document.getElementById("back-button").addEventListener("click", () => {
    if (!document.getElementById("dish-detail").classList.contains("hidden")) {
        closeDetail();
    } else {
        currentCategory = null;
        document.getElementById("menu").innerHTML = "";
        document.getElementById("back-button").classList.add("hidden");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

document.addEventListener("DOMContentLoaded", initMainMenu);

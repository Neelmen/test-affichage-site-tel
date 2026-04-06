// ================================
// app.js - site client
// ================================
const SUPABASE_URL = "https://oaxpofkmtrudriyrbxvy.supabase.co";
const BUCKET_NAME = "dishes-images";
const client = supabase.createClient(
    SUPABASE_URL,
    "sb_publishable_W0bTuLBKIo_-tSVK_XfKYg_LScZ_5EY"
);

const cache = {};
let currentCategory = null;
const detail = document.getElementById("dish-detail");
const backButton = document.getElementById("back-button");

function getImageUrlFromPath(imagePath) {
    if (!imagePath) return "";
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${imagePath}`;
}

async function showCategory(category) {
    const container = document.getElementById("menu");
    if (currentCategory === category) {
        currentCategory = null;
        closeMenuAnimation();
        return;
    }
    currentCategory = category;
    container.innerHTML = "";

    document.querySelectorAll("#navigation button").forEach(btn => {
        btn.classList.toggle("active", btn.textContent.toLowerCase() === category);
    });

    if (backButton) backButton.classList.remove("hidden");

    if (cache[category]) {
        displayCategory(cache[category]);
        scrollToMenu();
        return;
    }

    const { data, error } = await client
        .from("dishes")
        .select("*")
        .eq("category", category)
        .eq("available", true);

    if (error) {
        container.innerHTML = "<p>Erreur de chargement.</p>";
        return;
    }

    const grouped = data.reduce((acc, dish) => {
        const sub = dish.subcategory && dish.subcategory.trim() !== "" ? dish.subcategory : "_no_sub";
        if (!acc[sub]) acc[sub] = [];
        acc[sub].push(dish);
        return acc;
    }, {});

    cache[category] = grouped;
    displayCategory(grouped);
    scrollToMenu();
}

async function displayCategory(grouped) {
    const container = document.getElementById("menu");
    container.innerHTML = "";

    const entries = Object.entries(grouped);
    const withSub = entries.filter(([key]) => key !== "_no_sub");
    const noSub = entries.find(([key]) => key === "_no_sub");
    withSub.sort((a, b) => b[1].length - a[1].length);
    const sorted = noSub ? [...withSub, noSub] : withSub;

    for (const [sub, dishes] of sorted) {
        const title = document.createElement("h2");
        title.textContent = sub === "_no_sub" ? "Sélection" : sub;
        title.style.margin = "40px 0 20px";
        container.appendChild(title);

        const groupDiv = document.createElement("div");
        groupDiv.className = "category-group";
        container.appendChild(groupDiv);

        for (const dish of dishes) {
            const card = document.createElement("div");
            card.className = "card";
            card.style.opacity = "0";
            card.style.transform = "translateY(20px)";

            const img = document.createElement("img");
            img.src = getImageUrlFromPath(dish.image_path);

            const h3Name = document.createElement("h3");
            h3Name.textContent = dish.name;

            const pPrice = document.createElement("p");
            pPrice.textContent = dish.price + " €";
            pPrice.style.paddingBottom = "15px";

            card.append(img, h3Name, pPrice);
            card.addEventListener("click", () => showDetail(dish));
            groupDiv.appendChild(card);

            // Animation d'entrée
            setTimeout(() => {
                card.style.transition = "all 0.5s ease";
                card.style.opacity = "1";
                card.style.transform = "translateY(0)";
            }, 100);
        }
    }
}

function showDetail(dish) {
    detail.classList.remove("hidden");
    detail.classList.add("active");
    detail.innerHTML = `
        <div class="detail-card">
            <img src="${getImageUrlFromPath(dish.image_path)}" alt="${dish.name}">
            <h3>${dish.name}</h3>
            <p style="font-size: 1.2rem; color: #f4ab30;">${dish.price} €</p>
            <p>${dish.description || ""}</p>
            <p style="font-size: 0.8rem; opacity: 0.7;">${dish.ingredients || ""}</p>
        </div>
    `;
    document.body.classList.add("overlay-open");
    // La fermeture se fait via le bouton retour ou clic sur le fond
}

function closeDetail() {
    detail.classList.remove("active");
    detail.classList.add("hidden");
    document.body.classList.remove("overlay-open");
}

detail.addEventListener("click", (e) => {
    if (e.target === detail) closeDetail();
});

function initMainMenu() {
    const nav = document.getElementById("navigation");
    const categories = ["entree", "plat", "dessert", "boisson", "accompagnement"];
    const labels = { entree: "ENTRÉES", plat: "PLATS", dessert: "DESSERTS", boisson: "BOISSONS", accompagnement: "ACCOMPAGNEMENTS" };

    categories.forEach(cat => {
        const btn = document.createElement("button");
        btn.textContent = labels[cat];
        btn.addEventListener("click", () => showCategory(cat));
        nav.appendChild(btn);
    });
}

function addRippleEffect() {
    document.addEventListener("mousedown", function (e) {
        const button = e.target.closest("button, #back-button");
        if (!button) return;

        const ripple = document.createElement("span");
        ripple.classList.add("ripple");
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);

        ripple.style.width = ripple.style.height = size + "px";
        ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
        ripple.style.top = (e.clientY - rect.top - size / 2) + "px";

        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
}

function scrollToMenu() {
    const container = document.getElementById("menu");
    setTimeout(() => {
        container.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
}

function closeMenuAnimation() {
    document.getElementById("menu").innerHTML = "";
    backButton.classList.add("hidden");
    document.querySelectorAll("#navigation button").forEach(btn => btn.classList.remove("active"));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

backButton.addEventListener("click", () => {
    if (!detail.classList.contains("hidden")) {
        closeDetail();
    } else {
        closeMenuAnimation();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    initMainMenu();
    addRippleEffect();
});
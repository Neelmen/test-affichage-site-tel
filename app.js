// Configuration Supabase
const SUPABASE_URL = "https://oaxpofkmtrudriyrbxvy.supabase.co";
const BUCKET_NAME = "dishes-images";
const client = supabase.createClient(SUPABASE_URL, "sb_publishable_W0bTuLBKIo_-tSVK_XfKYg_LScZ_5EY");

const cache = {};
let currentCategory = null;
const detail = document.getElementById("dish-detail");
const backButton = document.getElementById("back-button");

/**
 * Formate l'URL de l'image stockée sur Supabase
 */
function getImageUrlFromPath(imagePath) {
    if (!imagePath) return "";
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${imagePath}`;
}

/**
 * Gère l'affichage d'une catégorie et le filtrage des données
 */
async function showCategory(category) {
    const container = document.getElementById("menu");
    
    // Si on clique sur la catégorie déjà active, on ferme tout
    if (currentCategory === category) {
        closeMenuAnimation();
        return;
    }
    
    currentCategory = category;
    container.innerHTML = "";

    // Mise à jour visuelle des boutons de navigation (Style iOS Active)
    document.querySelectorAll("#navigation button").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute('data-cat') === category);
    });

    // Affiche le bouton retour global
    backButton.classList.remove("hidden");

    // Utilisation du cache pour éviter des appels API inutiles
    if (cache[category]) {
        displayCategory(cache[category]);
        return;
    }

    // Appel API Supabase
    const { data, error } = await client
        .from("dishes")
        .select("*")
        .eq("category", category)
        .eq("available", true);

    if (error) {
        console.error("Erreur lors de la récupération :", error);
        return;
    }

    // Groupement par sous-catégorie
    const grouped = data.reduce((acc, dish) => {
        const sub = dish.subcategory || "_no_sub";
        if (!acc[sub]) acc[sub] = [];
        acc[sub].push(dish);
        return acc;
    }, {});

    // Mise en cache et affichage
    cache[category] = grouped;
    displayCategory(grouped);
}

/**
 * Génère le DOM pour la catégorie sélectionnée (MODE LISTE)
 */
function displayCategory(grouped) {
    const container = document.getElementById("menu");
    container.innerHTML = ""; // Nettoie le conteneur

    Object.entries(grouped).forEach(([sub, dishes]) => {
        // Titre de la sous-catégorie
        const title = document.createElement("h2");
        title.textContent = sub === "_no_sub" ? "La Sélection" : sub;
        container.appendChild(title);

        // Conteneur du groupe (gère l'espacement de la liste)
        const groupDiv = document.createElement("div");
        groupDiv.className = "category-group";

        // Création des cartes
        dishes.forEach(dish => {
            const card = document.createElement("div");
            card.className = "card";

            // Logique de prix
            const displayPrice = (dish.price === 0 || dish.price === "0")
                ? "Inclus"
                : `${dish.price} €`;

            card.innerHTML = `
                <img src="${getImageUrlFromPath(dish.image_path)}" alt="${dish.name}" loading="lazy">
                <h3>${dish.name}</h3>
                <p>${displayPrice}</p>
            `;
            // Clic pour ouvrir le détail
            card.onclick = () => showDetail(dish);
            groupDiv.appendChild(card);
        });
        container.appendChild(groupDiv);
    });

    // Scroll doux vers le début du menu
    window.scrollTo({ top: container.offsetTop - 20, behavior: 'smooth' });
}

/**
 * Affiche les détails d'un plat dans la modal iOS-style (Bottom Sheet)
 */
function showDetail(dish) {
    const displayPrice = (dish.price === 0 || dish.price === "0")
        ? "Inclus"
        : `${dish.price} €`;

    let extraContent = "";
    if (dish.description) {
        extraContent += `<p style="margin-top:20px; font-size:1.1rem; line-height:1.6; color: rgba(255,255,255,0.85);">${dish.description}</p>`;
    }
    if (dish.ingredients) {
        extraContent += `<p style="font-size:0.9rem; color: var(--accent-color); margin-top:15px; font-weight:400; font-style:italic;">
                            <b style="font-style:normal; color:white;">Ingrédients :</b> ${dish.ingredients}
                         </p>`;
    }

    // Modification ici : ajout de onclick="closeDetail()" sur le zoom-container
    // et stopPropagation sur le bloc texte si on veut quand même pouvoir copier le texte sans fermer.
    detail.innerHTML = `
        <div class="zoom-container" onclick="closeDetail()">
            <div style="width:40px; height:5px; background:rgba(255,255,255,0.2); border-radius:10px; margin: 0 auto 20px;"></div>
            
            <img src="${getImageUrlFromPath(dish.image_path)}" class="zoom-image">
            
            <div class="zoom-info" onclick="event.stopPropagation()">
                <h2 style="border:none; padding:0; margin: 20px 0 5px; font-size:1.8rem;">${dish.name}</h2>
                <div style="font-size:1.5rem; font-weight:700; color: var(--accent-color)">${displayPrice}</div>
                ${extraContent}
            </div>
            
            <div style="height:100px;"></div> 
        </div>
    `;
    
    detail.classList.add("active");
    detail.classList.remove("hidden");
    document.body.classList.add("overlay-open");
    
    // On garde aussi le clic sur l'arrière-plan vide
    detail.onclick = (e) => {
        if (e.target === detail) closeDetail();
    };
}

function closeDetail() {
    detail.classList.remove("active");
    // Laisse le temps à l'animation CSS de se finir avant de cacher complètement
    setTimeout(() => detail.classList.add("hidden"), 400); 
    document.body.classList.remove("overlay-open");
}

/**
 * Réinitialise la vue principale (quand on ferme une catégorie)
 */
function closeMenuAnimation() {
    currentCategory = null;
    document.getElementById("menu").innerHTML = "";
    backButton.classList.add("hidden");
    // Désactive tous les boutons de nav
    document.querySelectorAll("#navigation button").forEach(btn => btn.classList.remove("active"));
    // Remonte en haut de page
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Logique du bouton retour unique
 */
backButton.onclick = () => {
    // Si le détail est ouvert, on ferme d'abord le détail
    if (detail.classList.contains("active")) {
        closeDetail();
    } else {
        // Sinon, on ferme la catégorie ouverte
        closeMenuAnimation();
    }
};

/**
 * Effet visuel de pression (Feedback Haptique iOS) appliqué aux éléments cliquables
 */
function addHapticFeedback() {
    const handlePress = (e) => {
        // Cible les boutons, les cartes et le bouton retour
        const btn = e.target.closest("button, .card, #back-button");
        if (btn) {
            btn.style.transform = "scale(0.96)"; // Légère réduction
            btn.style.transition = "transform 0.1s cubic-bezier(0.4, 0, 0.2, 1)";
        }
    };

    const handleRelease = (e) => {
        const btn = e.target.closest("button, .card, #back-button");
        if (btn) {
            btn.style.transform = ""; // Retour à la normale
        }
    };

    // Événements Souris
    document.addEventListener("mousedown", handlePress);
    document.addEventListener("mouseup", handleRelease);
    // Événements Tactiles (avec passive:true pour la performance)
    document.addEventListener("touchstart", handlePress, {passive: true});
    document.addEventListener("touchend", handleRelease, {passive: true});
}

/**
 * Initialisation au chargement du DOM
 */
document.addEventListener("DOMContentLoaded", () => {
    const nav = document.getElementById("navigation");
    // Structure des catégories et libellés correspondants
    const labels = {
        entree: "Entrées",
        plat: "Plats",
        accompagnement: "Accompagnements", // C'est pro maintenant !
        dessert: "Desserts",
        boisson: "Boissons"
    };

    // Génération dynamique des boutons de navigation
    Object.keys(labels).forEach(cat => {
        const btn = document.createElement("button");
        btn.textContent = labels[cat];
        btn.setAttribute('data-cat', cat);
        btn.onclick = () => showCategory(cat);
        nav.appendChild(btn);
    });

    // Activation de l'effet de feedback au clic
    addHapticFeedback();
});

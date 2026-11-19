
// =====================================
// APPLICATION SUIVI VINTED
// Gestion de la base de données
// 15-11-26
// =====================================

const DB_NAME = "VintedDatabase";
const DB_VERSION = 1;

// Conversion sécurisée des prix
function convertirPrix(valeur) {
    if (typeof valeur === "number") {
        return Number.isFinite(valeur) ? valeur : 0;
    }

    const texte = String(valeur ?? "")
        .trim()
        .replace(/\s/g, "")
        .replace(",", ".");

    const nombre = Number(texte);

    return Number.isFinite(nombre) ? nombre : 0;
}

let db;

// Ouverture de la base
function ouvrirBaseDeDonnees() {

    return new Promise((resolve, reject) => {

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function(event) {

            const database = event.target.result;

            if (!database.objectStoreNames.contains("achats")) {
                database.createObjectStore("achats", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }

            if (!database.objectStoreNames.contains("ventes")) {
                database.createObjectStore("ventes", {
                    keyPath: "id",
                    autoIncrement: true
                });
            }
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = function(event) {
            console.error(event.target.error);
            reject(event.target.error);
        };
    });
}

// =====================================
// NAVIGATION
// =====================================

const accueil = document.getElementById("accueil");
const pageAchats = document.getElementById("page-achats");

const pageHistorique = document.getElementById("page-historique");
const listeHistorique = document.getElementById("liste-historique");

const pageTableau = document.getElementById("page-tableau");

let graphiqueRepartition = null;
let graphiqueMensuel = null;

document.querySelector(".achats").addEventListener("click", function() {
    accueil.hidden = true;
    pageAchats.hidden = false;
});

document.querySelector(".sauvegarde").addEventListener("click", function() {
    document.getElementById("accueil").hidden = true;
    document.getElementById("page-sauvegarde").hidden = false;
});

document.getElementById("retour-sauvegarde").addEventListener("click", function() {
    document.getElementById("page-sauvegarde").hidden = true;
    document.getElementById("accueil").hidden = false;
});

document.getElementById("retour-accueil")
    .addEventListener("click", function() {

        pageAchats.hidden = true;
        accueil.hidden = false;
    });

document.querySelector(".historique").addEventListener("click", function() {

    accueil.hidden = true;
    pageHistorique.hidden = false;
    afficherHistorique();

});

document.querySelector(".tableau").addEventListener("click", function() {

    accueil.hidden = true;
    pageTableau.hidden = false;
    afficherTableauDeBord();

});

document.getElementById("retour-tableau")
    .addEventListener("click", function() {

        pageTableau.hidden = true;
        accueil.hidden = false;

    });

document.getElementById("retour-historique")
    .addEventListener("click", function() {

        pageHistorique.hidden = true;
        accueil.hidden = false;

    });


// =====================================
// DATE DU JOUR
// =====================================

function dateDuJour() {

    const maintenant = new Date();
    const annee = maintenant.getFullYear();
    const mois = String(maintenant.getMonth() + 1).padStart(2, "0");
    const jour = String(maintenant.getDate()).padStart(2, "0");

    return `${annee}-${mois}-${jour}`;
}

document.getElementById("date-achat").value = dateDuJour();

// =====================================
// SELECTION DES PHOTOS
// =====================================

const champPhotos = document.getElementById("photos-achat");
const apercuPhotos = document.getElementById("apercu-photos");

let photosSelectionnees = [];

// Gestion de la modification d'un achat
let achatEnCoursId = null;
let photosExistantes = [];

champPhotos.addEventListener("change", function() {

    const fichiers = Array.from(champPhotos.files);

    const nouvellesPhotos = fichiers.filter(fichier =>
        fichier.type.startsWith("image/")
    );

    if (photosExistantes.length + photosSelectionnees.length + nouvellesPhotos.length > 3) {
        alert("Maximum 3 photos au total !");
        champPhotos.value = "";
        return;
    }

    photosSelectionnees.push(...nouvellesPhotos);

    champPhotos.value = "";

    afficherPhotos();
});

function afficherPhotos() {

    apercuPhotos.innerHTML = "";

    function ajouterPhoto(photo, supprimerPhoto) {

        const cadre = document.createElement("div");
        cadre.style.position = "relative";
        cadre.style.display = "inline-block";
        cadre.style.margin = "5px";

        const image = document.createElement("img");
        image.src = URL.createObjectURL(photo);
        image.style.width = "110px";
        image.style.height = "110px";
        image.style.objectFit = "cover";
        image.style.borderRadius = "10px";

        const bouton = document.createElement("button");
        bouton.textContent = "✖";
        bouton.type = "button";
        bouton.style.position = "absolute";
        bouton.style.top = "3px";
        bouton.style.right = "3px";
        bouton.style.background = "red";
        bouton.style.color = "white";
        bouton.style.border = "none";
        bouton.style.borderRadius = "50%";
        bouton.style.cursor = "pointer";
        bouton.style.width = "30px";
        bouton.style.height = "30px";
        bouton.style.minWidth = "30px";
        bouton.style.minHeight = "30px";
        bouton.style.padding = "0";
        bouton.style.margin = "0";
        bouton.style.display = "flex";
        bouton.style.alignItems = "center";
        bouton.style.justifyContent = "center";
        bouton.style.fontSize = "18px";
        bouton.style.lineHeight = "1";
        bouton.style.zIndex = "20";
        bouton.style.boxSizing = "border-box";

        bouton.addEventListener("click", supprimerPhoto);

        cadre.appendChild(image);
        cadre.appendChild(bouton);
        apercuPhotos.appendChild(cadre);
    }

    photosExistantes.forEach(function(photo, index) {
        ajouterPhoto(photo, function() {
            photosExistantes.splice(index, 1);
            afficherPhotos();
        });
    });

    photosSelectionnees.forEach(function(photo, index) {
        ajouterPhoto(photo, function() {
            photosSelectionnees.splice(index, 1);
            afficherPhotos();
        });
    });
}


// =====================================
// ENREGISTREMENT D'UN ACHAT
// =====================================

document.getElementById("form-achat")
    .addEventListener("submit", async function(event) {

        event.preventDefault();

        if (!db) {
            alert("La base de données n'est pas disponible.");
            return;
        }

        // Compression des nouvelles photos
        
        const toutesLesPhotos = [
            ...photosExistantes,
            ...photosSelectionnees
        ];

        const photosAEnregistrer = await Promise.all(
            toutesLesPhotos.map(photo => compresserPhoto(photo))
        );

        const achat = {

            date: document.getElementById("date-achat").value,

            designation: document.getElementById("designation-achat").value.trim(),

            categorie: document.getElementById("categorie-achat").value,

            prix: convertirPrix(document.getElementById("prix-achat").value), 

            photos: photosAEnregistrer,

            commentaire: document.getElementById("commentaire-achat").value.trim(),

            dateCreation: new Date().toISOString()
        };

        const transaction = db.transaction(["achats"], "readwrite");

        const magasin = transaction.objectStore("achats");

        if (achatEnCoursId !== null) {
            achat.id = achatEnCoursId;
            magasin.put(achat);
        } else {
            magasin.add(achat);
        }

        transaction.oncomplete = function() {

            alert("Achat enregistré avec succès !");

            achatEnCoursId = null;
            photosExistantes = [];

            document.querySelector("#form-achat button[type='submit']")
                .textContent = "Enregistrer l'achat";

            document.getElementById("form-achat").reset();

            photosSelectionnees = [];
            afficherPhotos();

            document.getElementById("date-achat").value = dateDuJour();
        };

        transaction.onerror = function() {
            alert("Erreur lors de l'enregistrement de l'achat.");
            console.error(transaction.error);
        };
    });

// =====================================
// DEMARRAGE DE L'APPLICATION
// =====================================

ouvrirBaseDeDonnees().catch(function(erreur) {
    alert("Impossible d'ouvrir la base de données.");
    console.error(erreur);
});

// =====================================
// AFFICHAGE DE LA LISTE DES ACHATS
// =====================================

const listeAchats = document.getElementById("liste-achats");
const conteneurAchats = document.getElementById("conteneur-achats");

const rechercheAchats = document.getElementById("recherche-achats");

rechercheAchats.addEventListener("input", function() {
    afficherListeAchats();
});

document.getElementById("voir-achats").addEventListener("click", function() {
    pageAchats.hidden = true;
    listeAchats.hidden = false;
    afficherListeAchats();
});

document.getElementById("retour-achats").addEventListener("click", function() {
    listeAchats.hidden = true;
    pageAchats.hidden = false;
});

function afficherListeAchats() {

    const transaction = db.transaction(["achats"], "readonly");
    const magasin = transaction.objectStore("achats");
    const request = magasin.getAll();

    request.onsuccess = function() {

        const terme = rechercheAchats.value.trim().toLowerCase();

        const achats = request.result.filter(function(achat) {
            return achat.designation.toLowerCase().includes(terme);
        });

        conteneurAchats.innerHTML = "";

        if (achats.length === 0) {
            conteneurAchats.innerHTML =
                '<p class="achat-vide">Aucun achat enregistré.</p>';
            return;
        }

        // Du plus récent au plus ancien
        achats.reverse();

        achats.forEach(function(achat) {

            const carte = document.createElement("div");
            carte.className = "carte-achat";

            const titre = document.createElement("h3");
            titre.textContent = achat.designation;

            const informations = document.createElement("p");
            informations.textContent =
                "Date : " + achat.date +
                " | Catégorie : " + achat.categorie +
                " | Prix : " + convertirPrix(achat.prix).toFixed(2) + " €";

            carte.appendChild(titre);
            carte.appendChild(informations);

            if (achat.commentaire) {
                const commentaire = document.createElement("p");
                commentaire.textContent = "Commentaire : " + achat.commentaire;
                carte.appendChild(commentaire);
            }

            const zonePhotos = document.createElement("div");
            zonePhotos.className = "photos-achat";

            (achat.photos || []).forEach(function(photo) {

                const image = document.createElement("img");
                image.src = URL.createObjectURL(photo);
                image.alt = achat.designation;

                zonePhotos.appendChild(image);
            });

            carte.appendChild(zonePhotos);

            // Bouton supprimer
            const boutons = document.createElement("div");
            boutons.className = "boutons-achats";


            const modifier = document.createElement("button");
            modifier.textContent = "✏️ Modifier";
            modifier.className = "bouton-modifier";

            modifier.addEventListener("click", function() {
                chargerAchatPourModification(achat);
            });

            boutons.appendChild(modifier);


            const supprimer = document.createElement("button");
            supprimer.textContent = "🗑️ Supprimer";
            supprimer.className = "bouton-supprimer";

            supprimer.addEventListener("click", function() {

                if (!confirm("Supprimer cet achat définitivement ?")) {
                    return;
                }

                const tx = db.transaction(["achats"], "readwrite");
                tx.objectStore("achats").delete(achat.id);

                tx.oncomplete = function() {
                    afficherListeAchats();
                };

                tx.onerror = function() {
                    alert("Erreur lors de la suppression.");
                };
            });

            boutons.appendChild(supprimer);
            carte.insertBefore(boutons, zonePhotos);

            conteneurAchats.appendChild(carte);
        });
    };

    request.onerror = function() {
        alert("Impossible de charger les achats.");
    };
}

function chargerAchatPourModification(achat) {

    achatEnCoursId = achat.id;

    // Remplissage du formulaire
    document.getElementById("date-achat").value = achat.date;
    document.getElementById("designation-achat").value = achat.designation;
    document.getElementById("categorie-achat").value = achat.categorie;
    document.getElementById("prix-achat").value = achat.prix;
    document.getElementById("commentaire-achat").value = achat.commentaire || "";

    // Conservation des anciennes photos
    photosExistantes = achat.photos || [];

    console.log("ANCIENNES PHOTOS :", photosExistantes.length);

    photosSelectionnees = [];

    champPhotos.value = "";
    afficherPhotos();

    // Changement du texte du bouton
    document.querySelector("#form-achat button[type='submit']")
        .textContent = "Enregistrer les modifications";

    // Afficher le formulaire
    listeAchats.hidden = true;
    pageAchats.hidden = false;

    window.scrollTo(0, 0);
}

// =====================================
// COMPRESSION DES PHOTOS
// =====================================

function compresserPhoto(fichier) {

    return new Promise((resolve, reject) => {

        const image = new Image();
        const url = URL.createObjectURL(fichier);

        image.onload = function() {

            const largeurMax = 1200;
            const hauteurMax = 1200;

            let largeur = image.width;
            let hauteur = image.height;

            const facteur = Math.min(
                largeurMax / largeur,
                hauteurMax / hauteur,
                1
            );

            largeur = Math.round(largeur * facteur);
            hauteur = Math.round(hauteur * facteur);

            const canvas = document.createElement("canvas");

            canvas.width = largeur;
            canvas.height = hauteur;

            const contexte = canvas.getContext("2d");

            // Fond blanc pour le format JPEG
            contexte.fillStyle = "#FFFFFF";
            contexte.fillRect(0, 0, largeur, hauteur);

            contexte.drawImage(image, 0, 0, largeur, hauteur);

            canvas.toBlob(function(blob) {

                URL.revokeObjectURL(url);

                if (!blob) {
                    reject(new Error("Compression impossible"));
                    return;
                }

                resolve(blob);

            }, "image/jpeg", 0.75);
        };

        image.onerror = function() {
            URL.revokeObjectURL(url);
            reject(new Error("Impossible de lire la photo"));
        };

        image.src = url;

    });
}


// =====================================
// MODULE VENTES
// =====================================

const pageVentes = document.getElementById("page-ventes");
const formVente = document.getElementById("form-vente");

// Navigation vers les ventes
document.querySelector(".ventes").addEventListener("click", function() {

    accueil.hidden = true;
    pageAchats.hidden = true;
    listeAchats.hidden = true;
    pageVentes.hidden = false;

});

// Retour à l'accueil
document.getElementById("retour-accueil-ventes")
    .addEventListener("click", function() {

        pageVentes.hidden = true;
        accueil.hidden = false;

    });

// Date du jour
document.getElementById("date-vente").value = dateDuJour();

// =====================================
// PHOTOS DES VENTES
// =====================================

const champPhotosVente = document.getElementById("photos-vente");
const apercuPhotosVente = document.getElementById("apercu-photos-vente");

let photosVenteSelectionnees = [];

let venteEnCoursId = null;
let photosVenteExistantes = [];

champPhotosVente.addEventListener("change", function() {

    const fichiers = Array.from(champPhotosVente.files);

    const nouvellesPhotos = fichiers.filter(fichier =>
        fichier.type.startsWith("image/")
    );

    if (photosVenteExistantes.length +
        photosVenteSelectionnees.length +
        nouvellesPhotos.length > 3) {

        alert("Maximum 3 photos au total !");
        champPhotosVente.value = "";
        return;
    }

    photosVenteSelectionnees.push(...nouvellesPhotos);

    champPhotosVente.value = "";

    afficherPhotosVente();
});

function afficherPhotosVente() {

    apercuPhotosVente.innerHTML = "";

    function ajouterPhoto(photo, supprimerPhoto) {

        const cadre = document.createElement("div");
        cadre.style.position = "relative";
        cadre.style.display = "inline-block";
        cadre.style.margin = "5px";

        const image = document.createElement("img");
        image.src = URL.createObjectURL(photo);
        image.style.width = "110px";
        image.style.height = "110px";
        image.style.objectFit = "cover";
        image.style.borderRadius = "10px";

        const bouton = document.createElement("button");
        bouton.textContent = "✖";
        bouton.type = "button";
        bouton.style.position = "absolute";
        bouton.style.top = "3px";
        bouton.style.right = "3px";
        bouton.style.background = "red";
        bouton.style.color = "white";
        bouton.style.border = "none";
        bouton.style.borderRadius = "50%";
        bouton.style.cursor = "pointer";
        bouton.style.width = "30px";
        bouton.style.height = "30px";
        bouton.style.minWidth = "30px";
        bouton.style.minHeight = "30px";
        bouton.style.padding = "0";
        bouton.style.margin = "0";
        bouton.style.display = "flex";
        bouton.style.alignItems = "center";
        bouton.style.justifyContent = "center";
        bouton.style.fontSize = "18px";
        bouton.style.lineHeight = "1";
        bouton.style.zIndex = "20";
        bouton.style.boxSizing = "border-box";

        bouton.addEventListener("click", supprimerPhoto);

        cadre.appendChild(image);
        cadre.appendChild(bouton);
        apercuPhotosVente.appendChild(cadre);
    }

    photosVenteExistantes.forEach(function(photo, index) {
        ajouterPhoto(photo, function() {
            photosVenteExistantes.splice(index, 1);
            afficherPhotosVente();
        });
    });

    photosVenteSelectionnees.forEach(function(photo, index) {
        ajouterPhoto(photo, function() {
            photosVenteSelectionnees.splice(index, 1);
            afficherPhotosVente();
        });
    });
}

// =====================================
// ENREGISTREMENT DES VENTES
// =====================================

formVente.addEventListener("submit", async function(event) {

    event.preventDefault();

    if (!db) {
        alert("La base de données n'est pas disponible.");
        return;
    }

    try {

        // Compression des photos
        const toutesLesPhotosVente = [
            ...photosVenteExistantes,
            ...photosVenteSelectionnees
        ];

const photosCompressees = await Promise.all(
    toutesLesPhotosVente.map(photo => compresserPhoto(photo))
);

        const vente = {

            date: document.getElementById("date-vente").value,

            designation: document.getElementById("designation-vente").value.trim(),

            categorie: document.getElementById("categorie-vente").value,

            prix: convertirPrix(document.getElementById("prix-vente").value), 

            photos: photosCompressees,

            commentaire: document.getElementById("commentaire-vente").value.trim(),

            dateCreation: new Date().toISOString()

        };

        const transaction = db.transaction(["ventes"], "readwrite");

        const magasinVentes = transaction.objectStore("ventes");

        if (venteEnCoursId !== null) {
            vente.id = venteEnCoursId;
            magasinVentes.put(vente);
        } else {
            magasinVentes.add(vente);
        }

        transaction.oncomplete = function() {

        const modification = venteEnCoursId !== null;

        venteEnCoursId = null;
        photosVenteExistantes = [];
        photosVenteSelectionnees = [];

        formVente.reset();
        afficherPhotosVente();

        document.querySelector("#form-vente button[type='submit']")
            .textContent = "Enregistrer la vente";

        alert(
            modification
                ? "Vente modifiée avec succès !"
                : "Vente enregistrée avec succès !"
        );   

            document.getElementById("date-vente").value = dateDuJour();

        };

        transaction.onerror = function() {

            alert("Erreur lors de l'enregistrement de la vente.");

            console.error(transaction.error);

        };

    } catch (erreur) {

        console.error(erreur);
        alert("Une erreur est survenue pendant le traitement des photos.");

    }

});


// =====================================
// AFFICHAGE DE LA LISTE DES VENTES
// =====================================

const listeVentes = document.getElementById("liste-ventes");
const conteneurVentes = document.getElementById("conteneur-ventes");

const rechercheVentes = document.getElementById("recherche-ventes");

rechercheVentes.addEventListener("input", function() {
    afficherListeVentes();
});

// Ouvrir la liste
document.getElementById("voir-ventes").addEventListener("click", function() {

    pageVentes.hidden = true;
    listeVentes.hidden = false;

    afficherListeVentes();

});

// Retour au formulaire ventes
document.getElementById("retour-ventes").addEventListener("click", function() {

    listeVentes.hidden = true;
    pageVentes.hidden = false;

});

// Afficher les ventes enregistrées
function afficherListeVentes() {

    const transaction = db.transaction(["ventes"], "readonly");
    const magasin = transaction.objectStore("ventes");
    const request = magasin.getAll();

    request.onsuccess = function() {

        const terme = rechercheVentes.value.trim().toLowerCase();

        const ventes = request.result.filter(function(vente) {
            return vente.designation.toLowerCase().includes(terme);
        });

        conteneurVentes.innerHTML = "";

        if (ventes.length === 0) {
            conteneurVentes.innerHTML =
                '<p class="vente-vide">Aucune vente enregistrée.</p>';
            return;
        }

        ventes.reverse();

        ventes.forEach(function(vente) {

            const carte = document.createElement("div");
            carte.className = "carte-vente";

            const titre = document.createElement("h3");
            titre.textContent = vente.designation;

            const informations = document.createElement("p");
            informations.textContent =
                "Date : " + vente.date +
                " | Catégorie : " + vente.categorie +
                " | Prix : " + convertirPrix(vente.prix).toFixed(2) + " €";

            carte.appendChild(titre);
            carte.appendChild(informations);

            if (vente.commentaire) {
                const commentaire = document.createElement("p");
                commentaire.textContent =
                    "Commentaire : " + vente.commentaire;
                carte.appendChild(commentaire);
            }

            const zonePhotos = document.createElement("div");
            zonePhotos.className = "photos-vente";

            (vente.photos || []).forEach(function(photo) {
                const image = document.createElement("img");
                image.src = URL.createObjectURL(photo);
                image.alt = vente.designation;
                zonePhotos.appendChild(image);
            });

            carte.appendChild(zonePhotos);

            const boutons = document.createElement("div");
            boutons.className = "boutons-vente";

            const modifier = document.createElement("button");
            modifier.textContent = "✏️ Modifier";
            modifier.className = "bouton-modifier";

            modifier.addEventListener("click", function() {
                chargerVentePourModification(vente);
            });

            boutons.appendChild(modifier);

            const supprimer = document.createElement("button");
            supprimer.textContent = "🗑️ Supprimer";
            supprimer.className = "bouton-supprimer";

            supprimer.addEventListener("click", function() {

                if (!confirm("Supprimer cette vente définitivement ?")) {
                    return;
                }

                const tx = db.transaction(["ventes"], "readwrite");
                tx.objectStore("ventes").delete(vente.id);

                tx.oncomplete = function() {
                    afficherListeVentes();
                };

                tx.onerror = function() {
                    alert("Erreur lors de la suppression.");
                };
            });

            boutons.appendChild(supprimer);
            carte.insertBefore(boutons, zonePhotos);

            conteneurVentes.appendChild(carte);
        });
    };

    request.onerror = function() {
        alert("Impossible de charger les ventes.");
    };
}

// =====================================
// VARIABLES DE L'HISTORIQUE
// =====================================

// =====================================
// TABLEAU DE BORD
// =====================================

function afficherTableauDeBord() {

    const transaction = db.transaction(
        ["achats", "ventes"],
        "readonly"
    );

    const requeteAchats =
        transaction.objectStore("achats").getAll();

    const requeteVentes =
        transaction.objectStore("ventes").getAll();

    transaction.oncomplete = function() {

        const achats = requeteAchats.result;
        const ventes = requeteVentes.result;

        const nombreAchats = achats.length;
        const nombreVentes = ventes.length;

        const totalAchats = achats.reduce(
            (total, achat) => total + convertirPrix(achat.prix), 0
        );

        const totalVentes = ventes.reduce(
            (total, vente) => total + convertirPrix(vente.prix), 0
        );

        const anneeEnCours = new Date().getFullYear();

        const totalOperationsAnnee =
            achats
                .filter(achat => achat.date.startsWith(String(anneeEnCours)))
                .reduce((total, achat) => total + convertirPrix(achat.prix), 0)
            +
            ventes
                .filter(vente => vente.date.startsWith(String(anneeEnCours)))
                .reduce((total, vente) => total + convertirPrix(vente.prix), 0);

            // Graphique circulaire : répartition des opérations

            if (graphiqueRepartition) {
                graphiqueRepartition.destroy();
            }

            graphiqueRepartition = new Chart(
                document.getElementById("graphique-repartition"),
                {
                    type: "doughnut",

                    data: {
                        labels: ["Achats", "Ventes"],

                        datasets: [{
                            data: [nombreAchats, nombreVentes],
                            backgroundColor: ["#5B9BD5", "#65A69F"]
                        }]
                    },

                    options: {
                        responsive: true,
                        maintainAspectRatio: false
                    }
                }
            );  
            
            // Graphique mensuel : achats et ventes

const mois = [
    "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
    "Juil", "Août", "Sep", "Oct", "Nov", "Déc"
];

const montantsAchats = Array(12).fill(0);
const montantsVentes = Array(12).fill(0);

achats.forEach(function(achat) {
    const date = new Date(achat.date + "T12:00:00");

    if (date.getFullYear() === anneeEnCours) {
        montantsAchats[date.getMonth()] += convertirPrix(achat.prix);
    }
});

ventes.forEach(function(vente) {
    const date = new Date(vente.date + "T12:00:00");

    if (date.getFullYear() === anneeEnCours) {
        montantsVentes[date.getMonth()] += convertirPrix(vente.prix);
    }
});

if (graphiqueMensuel) {
    graphiqueMensuel.destroy();
}

graphiqueMensuel = new Chart(
    document.getElementById("graphique-mensuel"),
    {
        type: "bar",

        data: {
            labels: mois,

            datasets: [
                {
                    label: "Achats (€)",
                    data: montantsAchats,
                    backgroundColor: "#5B9BD5"
                },
                {
                    label: "Ventes (€)",
                    data: montantsVentes,
                    backgroundColor: "#65A69F"
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    }
);

            document.getElementById("indicateurs-tableau").innerHTML = `
                <div class="indicateur">
                    <h3>Nombre d'achats</h3>
                    <p>${nombreAchats}</p>
                </div>

                <div class="indicateur">
                    <h3>Nombre de ventes</h3>
                    <p>${nombreVentes}</p>
                </div>

                <div class="indicateur">
                    <h3>Total des achats</h3>
                    <p>${totalAchats.toFixed(2)} €</p>
                </div>

                <div class="indicateur">
                    <h3>Total des ventes</h3>
                    <p>${totalVentes.toFixed(2)} €</p>
                </div>

                <div class="indicateur">
                    <h3>Total des opérations de l'année ${anneeEnCours}</h3>
                    <p>${totalOperationsAnnee.toFixed(2)} €</p>
                </div>
            `;

        };

    transaction.onerror = function() {
        alert("Erreur lors du chargement du tableau de bord.");
    };

}

let filtreHistorique = "toutes";
let operationsHistorique = [];

const filtreAnnee = document.getElementById("filtre-annee");
const filtreMois = document.getElementById("filtre-mois");

// =====================================
// AFFICHAGE DE L'HISTORIQUE
// =====================================

function afficherHistorique() {

    const transaction = db.transaction(
        ["achats", "ventes"],
        "readonly"
    );

    const magasinAchats = transaction.objectStore("achats");
    const magasinVentes = transaction.objectStore("ventes");

    const requeteAchats = magasinAchats.getAll();
    const requeteVentes = magasinVentes.getAll();

    transaction.oncomplete = function() {

        const achats = requeteAchats.result.map(function(achat) {
            return { ...achat, type: "achat" };
        });

        const ventes = requeteVentes.result.map(function(vente) {
            return { ...vente, type: "vente" };
        });

        operationsHistorique = [...achats, ...ventes];

        operationsHistorique.sort(function(a, b) {
            return b.date.localeCompare(a.date);
        });

        // Remplir la liste des années disponibles
        const annees = [...new Set(
            operationsHistorique.map(operation => operation.date.substring(0, 4))
        )].sort((a, b) => b.localeCompare(a));

        filtreAnnee.innerHTML = '<option value="toutes">Toutes les années</option>';

        annees.forEach(function(annee) {
            const option = document.createElement("option");
            option.value = annee;
            option.textContent = annee;
            filtreAnnee.appendChild(option);
        });

        afficherOperationsHistorique();

    };

    transaction.onerror = function() {
        alert("Erreur lors du chargement de l'historique.");
    };

}


// =====================================
// AFFICHAGE DES OPERATIONS
// =====================================

function afficherOperationsHistorique() {

    listeHistorique.innerHTML = "";

    const anneeChoisie = filtreAnnee.value;
    const moisChoisi = filtreMois.value;

    const operationsFiltrees = operationsHistorique.filter(
        function(operation) {

            const annee = operation.date.substring(0, 4);
            const mois = operation.date.substring(5, 7);

            const bonType =
                filtreHistorique === "toutes" ||
                operation.type === filtreHistorique;

            const bonneAnnee =
                anneeChoisie === "toutes" ||
                annee === anneeChoisie;

            const bonMois =
                moisChoisi === "tous" ||
                mois === moisChoisi;

            return bonType && bonneAnnee && bonMois;
        }
    );

    operationsFiltrees.forEach(function(operation) {

        const carte = document.createElement("div");
        carte.className = "carte-historique";

        const titre = document.createElement("h3");
        titre.textContent = operation.designation;

        const type = document.createElement("span");
        type.textContent =
            operation.type === "achat" ? "ACHAT" : "VENTE";

        type.className = "badge-" + operation.type;

        const informations = document.createElement("p");

        informations.textContent =
            "Date : " + operation.date +
            " | Catégorie : " + operation.categorie +
            " | Prix : " + convertirPrix(operation.prix).toFixed(2) + " €";

        carte.appendChild(type);
        carte.appendChild(titre);
        carte.appendChild(informations);

        if (operation.photos && operation.photos.length > 0) {

            const zonePhotos = document.createElement("div");
            zonePhotos.className = "photos-historique";

            operation.photos.forEach(function(photo) {

                const image = document.createElement("img");
                image.src = URL.createObjectURL(photo);
                image.alt = operation.designation;

                zonePhotos.appendChild(image);
            });

            carte.appendChild(zonePhotos);
        }

        listeHistorique.appendChild(carte);
    });
}
// =====================================
// FILTRES DE L'HISTORIQUE
// =====================================

document.getElementById("filtre-toutes")
    .addEventListener("click", function() {

        filtreHistorique = "toutes";
        afficherOperationsHistorique();

    });

document.getElementById("filtre-achats")
    .addEventListener("click", function() {

        filtreHistorique = "achat";
        afficherOperationsHistorique();

    });

document.getElementById("filtre-ventes")
    .addEventListener("click", function() {

        filtreHistorique = "vente";
        afficherOperationsHistorique();

    });

    // Filtres par année et par mois
filtreAnnee.addEventListener("change", function() {
    afficherOperationsHistorique();
});

filtreMois.addEventListener("change", function() {
    afficherOperationsHistorique();
});

// =====================================
// MODIFICATION D'UNE VENTE
// =====================================

function chargerVentePourModification(vente) {

    venteEnCoursId = vente.id;

    document.getElementById("date-vente").value = vente.date;

    document.getElementById("designation-vente").value =
        vente.designation;

    document.getElementById("categorie-vente").value =
        vente.categorie;

    document.getElementById("prix-vente").value =
        vente.prix;

    document.getElementById("commentaire-vente").value =
        vente.commentaire || "";

    photosVenteExistantes = vente.photos || [];
    photosVenteSelectionnees = [];

    champPhotosVente.value = "";

    afficherPhotosVente();

    document.querySelector("#form-vente button[type='submit']")
        .textContent = "Enregistrer les modifications";

    listeVentes.hidden = true;
    pageVentes.hidden = false;

    window.scrollTo(0, 0);
}

// =====================================
// SAUVEGARDE COMPLETE
// =====================================

function blobVersBase64(blob) {
    return new Promise((resolve, reject) => {
        const lecteur = new FileReader();

        lecteur.onload = function() {
            resolve(lecteur.result.split(",")[1]);
        };

        lecteur.onerror = function() {
            reject(lecteur.error);
        };

        lecteur.readAsDataURL(blob);
    });
}

async function preparerDonneesSauvegarde(enregistrements) {
    return Promise.all(enregistrements.map(async function(enregistrement) {

        const photos = await Promise.all(
            (enregistrement.photos || []).map(async function(photo) {
                return {
                    type: photo.type || "image/jpeg",
                    data: await blobVersBase64(photo)
                };
            })
        );

        return {
            ...enregistrement,
            photos: photos
        };
    }));
}

function lireMagasinPourSauvegarde(nomMagasin) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([nomMagasin], "readonly");
        const requete = transaction.objectStore(nomMagasin).getAll();

        requete.onsuccess = function() {
            resolve(requete.result);
        };

        requete.onerror = function() {
            reject(requete.error);
        };
    });
}

async function creerSauvegarde() {

    try {
        if (!db) {
            throw new Error("La base de données n'est pas encore ouverte.");
        }

        const achats = await lireMagasinPourSauvegarde("achats");
        const ventes = await lireMagasinPourSauvegarde("ventes");

        const sauvegarde = {
            format: "vinted-suivi-backup",
            version: 1,
            dateCreation: new Date().toISOString(),
            achats: await preparerDonneesSauvegarde(achats),
            ventes: await preparerDonneesSauvegarde(ventes)
        };

        const contenu = JSON.stringify(sauvegarde, null, 2);

        const fichier = new Blob(
            [contenu],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(fichier);
        const lien = document.createElement("a");

        const date = new Date().toISOString().slice(0, 10);

        lien.href = url;
        lien.download = "Sauvegarde_Vinted_" + date + ".json";

        document.body.appendChild(lien);
        lien.click();
        document.body.removeChild(lien);

        setTimeout(function() {
            URL.revokeObjectURL(url);
        }, 2000);

        alert("Sauvegarde créée avec succès !");

    } catch (erreur) {
        console.error("Erreur de sauvegarde :", erreur);
        alert("La sauvegarde a échoué : " + erreur.message);
    }
}

document.getElementById("creer-sauvegarde")
    .addEventListener("click", creerSauvegarde);

// =====================================
// RESTAURATION D'UNE SAUVEGARDE
// =====================================

function base64VersBlob(donnees, type) {
    const binaire = atob(donnees);
    const octets = new Uint8Array(binaire.length);

    for (let i = 0; i < binaire.length; i++) {
        octets[i] = binaire.charCodeAt(i);
    }

    return new Blob([octets], {
        type: type || "image/jpeg"
    });
}

async function convertirDonneesRestauration(enregistrements) {
    return Promise.all(enregistrements.map(async function(enregistrement) {

        const photos = await Promise.all(
            (enregistrement.photos || []).map(async function(photo) {

                if (!photo || typeof photo.data !== "string") {
                    throw new Error("Une photo de la sauvegarde est invalide.");
                }

                return base64VersBlob(photo.data, photo.type);
            })
        );

        return {
            ...enregistrement,
            photos: photos
        };
    }));
}

function telechargerSauvegardeSecurite() {
    return new Promise(async (resolve, reject) => {
        try {
            const achats = await lireMagasinPourSauvegarde("achats");
            const ventes = await lireMagasinPourSauvegarde("ventes");

            const sauvegarde = {
                format: "vinted-suivi-backup",
                version: 1,
                dateCreation: new Date().toISOString(),
                achats: await preparerDonneesSauvegarde(achats),
                ventes: await preparerDonneesSauvegarde(ventes)
            };

            const fichier = new Blob(
                [JSON.stringify(sauvegarde, null, 2)],
                { type: "application/json" }
            );

            const url = URL.createObjectURL(fichier);
            const lien = document.createElement("a");
            const date = new Date().toISOString().slice(0, 10);

            lien.href = url;
            lien.download = "Securite_Vinted_" + date + ".json";

            document.body.appendChild(lien);
            lien.click();
            document.body.removeChild(lien);

            setTimeout(function() {
                URL.revokeObjectURL(url);
            }, 2000);

            resolve();

        } catch (erreur) {
            reject(erreur);
        }
    });
}

async function restaurerSauvegarde(fichier) {

    try {
        if (!db) {
            throw new Error("La base de données n'est pas disponible.");
        }

        const texte = await fichier.text();
        const sauvegarde = JSON.parse(texte);

        if (
            sauvegarde.format !== "vinted-suivi-backup" ||
            sauvegarde.version !== 1 ||
            !Array.isArray(sauvegarde.achats) ||
            !Array.isArray(sauvegarde.ventes)
        ) {
            throw new Error("Ce fichier n'est pas une sauvegarde Vinted valide.");
        }

        const achats = await convertirDonneesRestauration(sauvegarde.achats);
        const ventes = await convertirDonneesRestauration(sauvegarde.ventes);

        if (!confirm(
            "Une sauvegarde de sécurité va être téléchargée avant le remplacement. Continuer ?"
        )) {
            return;
        }

        await telechargerSauvegardeSecurite();

        if (!confirm(
            "Vérifie que le fichier Securite_Vinted est bien enregistré dans Téléchargements. Les données actuelles seront ensuite remplacées. Continuer ?"
        )) {
            alert("Restauration annulée. Tes données actuelles sont conservées.");
            return;
        }

        await new Promise((resolve, reject) => {

            const transaction = db.transaction(
                ["achats", "ventes"],
                "readwrite"
            );

            const magasinAchats = transaction.objectStore("achats");
            const magasinVentes = transaction.objectStore("ventes");

            magasinAchats.clear();
            magasinVentes.clear();

            achats.forEach(function(achat) {
                magasinAchats.put(achat);
            });

            ventes.forEach(function(vente) {
                magasinVentes.put(vente);
            });

            transaction.oncomplete = resolve;

            transaction.onerror = function() {
                reject(transaction.error);
            };

            transaction.onabort = function() {
                reject(transaction.error || new Error("Restauration annulée."));
            };
        });

        alert("Restauration terminée avec succès !");

        location.reload();

    } catch (erreur) {
        console.error("Erreur de restauration :", erreur);
        alert("La restauration a échoué : " + erreur.message);
    }
}

document.getElementById("restaurer-sauvegarde")
    .addEventListener("click", function() {
        document.getElementById("fichier-sauvegarde").click();
    });

document.getElementById("fichier-sauvegarde")
    .addEventListener("change", function(event) {

        const fichier = event.target.files[0];

        if (fichier) {
            restaurerSauvegarde(fichier);
        }

        event.target.value = "";
    });

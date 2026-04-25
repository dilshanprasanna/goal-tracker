const STORAGE_KEYS = {
    USERS: "goalTrackerUsers",
    SESSION: "goalTrackerSessionUser"
};

let selectedItemId = null;

document.addEventListener("DOMContentLoaded", () => {
    initSharedModalClose();
    if (document.body.classList.contains("home-body")) {
        initHomePage();
    }
    if (document.body.classList.contains("items-body")) {
        initItemsPage();
    }
});

function initSharedModalClose() {
    const closeButtons = document.querySelectorAll("[data-close]");
    closeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            closeModal(button.dataset.close);
        });
    });

    const modals = document.querySelectorAll(".modal");
    modals.forEach((modal) => {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

function initHomePage() {
    const accountBtn = document.getElementById("accountBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const welcomeUser = document.getElementById("welcomeUser");
    const loginTabBtn = document.getElementById("loginTabBtn");
    const signupTabBtn = document.getElementById("signupTabBtn");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const showPasswordToggle = document.getElementById("showPasswordToggle");

    updateHomeUserState();

    accountBtn.addEventListener("click", () => openModal("authModal"));
    logoutBtn.addEventListener("click", () => {
        clearSessionUser();
        updateHomeUserState();
    });

    loginTabBtn.addEventListener("click", () => setAuthTab("login"));
    signupTabBtn.addEventListener("click", () => setAuthTab("signup"));

    showPasswordToggle.addEventListener("change", () => {
        const type = showPasswordToggle.checked ? "text" : "password";
        document.getElementById("signupPassword").type = type;
        document.getElementById("signupPasswordConfirm").type = type;
    });

    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        handleLogin();
    });

    signupForm.addEventListener("submit", (event) => {
        event.preventDefault();
        handleSignup();
    });

    function updateHomeUserState() {
        const current = getSessionUser();
        if (current) {
            welcomeUser.textContent = `Hello, ${current.username}`;
            welcomeUser.classList.remove("hidden");
            logoutBtn.classList.remove("hidden");
            accountBtn.innerHTML = "<i class='fas fa-user-check'></i> Account";
        } else {
            welcomeUser.classList.add("hidden");
            welcomeUser.textContent = "";
            logoutBtn.classList.add("hidden");
            accountBtn.innerHTML = "<i class='fas fa-user'></i> User Account";
        }
    }

    function setAuthTab(tab) {
        const isLogin = tab === "login";
        loginTabBtn.classList.toggle("active", isLogin);
        signupTabBtn.classList.toggle("active", !isLogin);
        loginForm.classList.toggle("active", isLogin);
        signupForm.classList.toggle("active", !isLogin);
        setAuthMessage("");
    }

    function handleLogin() {
        const username = document.getElementById("loginUsername").value.trim();
        const password = document.getElementById("loginPassword").value;
        const users = getUsers();
        const found = users.find((user) => user.username === username && user.password === password);

        if (!found) {
            setAuthMessage("Invalid username or password.");
            return;
        }

        setSessionUser(found.username);
        setAuthMessage("Login successful. Welcome back!");
        setTimeout(() => {
            closeModal("authModal");
            updateHomeUserState();
            document.getElementById("loginForm").reset();
        }, 500);
    }

    function handleSignup() {
        const name = document.getElementById("signupName").value.trim();
        const dob = document.getElementById("signupDob").value;
        const username = document.getElementById("signupUsername").value.trim();
        const password = document.getElementById("signupPassword").value;
        const confirm = document.getElementById("signupPasswordConfirm").value;
        const users = getUsers();

        if (!name || !dob || !username || !password || !confirm) {
            setAuthMessage("Please fill all sign up fields.");
            return;
        }

        if (password !== confirm) {
            setAuthMessage("Passwords do not match.");
            return;
        }

        if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
            setAuthMessage("Username already exists. Choose another one.");
            return;
        }

        users.push({ name, dob, username, password });
        saveUsers(users);
        ensureUserDataDefaults(username);
        setSessionUser(username);
        setAuthMessage("Sign up successful. Your account is saved.");

        setTimeout(() => {
            closeModal("authModal");
            updateHomeUserState();
            document.getElementById("signupForm").reset();
            setAuthTab("login");
        }, 650);
    }
}

function initItemsPage() {
    const user = getSessionUser();
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    let draggedItemId = null;
    let blockCardClick = false;

    const itemsUserLabel = document.getElementById("itemsUserLabel");
    itemsUserLabel.textContent = `User: ${user.username}`;

    const grid = document.getElementById("itemsGrid");
    const balanceInput = document.getElementById("accountBalance");
    const openAddItemBtn = document.getElementById("openAddItemBtn");
    const addItemForm = document.getElementById("addItemForm");
    const itemDetailForm = document.getElementById("itemDetailForm");
    const addExtraImageBtn = document.getElementById("addExtraImageBtn");
    const deleteItemBtn = document.getElementById("deleteItemBtn");

    grid.addEventListener("dragover", (event) => {
        event.preventDefault();
    });

    balanceInput.value = String(getUserBalance(user.username));
    renderItems();

    balanceInput.addEventListener("input", () => {
        const balance = clampMoney(balanceInput.value);
        saveUserBalance(user.username, balance);
        renderItems();
        refreshDetailProgress();
    });

    openAddItemBtn.addEventListener("click", () => {
        setItemMessage("");
        openModal("itemModal");
    });

    addItemForm.addEventListener("submit", (event) => {
        event.preventDefault();
        addItem();
    });

    itemDetailForm.addEventListener("submit", (event) => {
        event.preventDefault();
        saveItemDetails();
    });

    addExtraImageBtn.addEventListener("click", addExtraImageToSelectedItem);
    deleteItemBtn.addEventListener("click", deleteSelectedItem);

    function addItem() {
        const name = document.getElementById("itemName").value.trim();
        const subtitle = document.getElementById("itemSubtitle").value.trim();
        const image = document.getElementById("itemImage").value.trim();
        const price = clampMoney(document.getElementById("itemPrice").value);
        const description = document.getElementById("itemDescription").value.trim();

        if (!name || !image || !price) {
            setItemMessage("Name, image, and price are required.");
            return;
        }

        if (!isWithinWordLimit(description, 1000)) {
            setItemMessage("Description is too long. Maximum 1000 words.");
            return;
        }

        const items = getUserItems(user.username);
        items.push({
            id: String(Date.now()),
            name,
            subtitle,
            image,
            price,
            description,
            extraImages: []
        });

        saveUserItems(user.username, items);
        addItemForm.reset();
        setItemMessage("Item added successfully.");
        renderItems();
        setTimeout(() => closeModal("itemModal"), 450);
    }

    function renderItems() {
        const items = getUserItems(user.username);
        const balance = getUserBalance(user.username);

        if (!items.length) {
            grid.innerHTML = "<div class='empty-note'>No items yet. Click <strong>Add New Item</strong> to start your goals.</div>";
            return;
        }

        grid.innerHTML = items
            .map((item) => {
                const percentageRaw = item.price > 0 ? (balance / item.price) * 100 : 0;
                const percentage = Math.min(100, Math.max(0, percentageRaw));
                const statusText = percentage >= 100
                    ? "<span class='can-buy'>You can buy this item now.</span>"
                    : `${percentage.toFixed(1)}% collected`;

                return `
                    <article class="item-card" data-item-id="${item.id}" draggable="true">
                        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="card-img">
                        <div class="card-details">
                            <h3 class="card-title">${escapeHtml(item.name)}</h3>
                            <p class="card-subtitle">${escapeHtml(item.subtitle || "No subtitle")}</p>
                            <p class="card-price">Price: ${formatMoney(item.price)}</p>
                            <div class="progress-container">
                                <div class="progress-bar" style="width:${percentage}%"></div>
                            </div>
                            <span class="buy-status">${statusText}</span>
                            <p class="card-hint">Click card to open details and edit</p>
                        </div>
                    </article>
                `;
            })
            .join("");

        const cards = grid.querySelectorAll(".item-card");
        cards.forEach((card) => {
            card.addEventListener("click", () => {
                if (blockCardClick) {
                    return;
                }
                openDetail(card.dataset.itemId);
            });

            card.addEventListener("dragstart", (event) => {
                draggedItemId = card.dataset.itemId;
                blockCardClick = true;
                card.classList.add("dragging");
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", draggedItemId);
            });

            card.addEventListener("dragover", (event) => {
                event.preventDefault();
                if (!draggedItemId || draggedItemId === card.dataset.itemId) {
                    return;
                }
                card.classList.add("drop-target");
                event.dataTransfer.dropEffect = "move";
            });

            card.addEventListener("dragleave", () => {
                card.classList.remove("drop-target");
            });

            card.addEventListener("drop", (event) => {
                event.preventDefault();
                card.classList.remove("drop-target");
                const targetItemId = card.dataset.itemId;
                if (!draggedItemId || draggedItemId === targetItemId) {
                    return;
                }
                reorderItems(draggedItemId, targetItemId);
                draggedItemId = null;
            });

            card.addEventListener("dragend", () => {
                card.classList.remove("dragging");
                clearDropTargets();
                draggedItemId = null;
                setTimeout(() => {
                    blockCardClick = false;
                }, 0);
            });
        });
    }

    function reorderItems(fromItemId, toItemId) {
        const items = getUserItems(user.username);
        const fromIndex = items.findIndex((item) => item.id === fromItemId);
        const toIndex = items.findIndex((item) => item.id === toItemId);

        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
            return;
        }

        const [movedItem] = items.splice(fromIndex, 1);
        const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
        items.splice(insertIndex, 0, movedItem);
        saveUserItems(user.username, items);
        renderItems();
    }

    function clearDropTargets() {
        const targets = document.querySelectorAll(".item-card.drop-target");
        targets.forEach((target) => target.classList.remove("drop-target"));
    }

    function openDetail(itemId) {
        selectedItemId = itemId;
        setDetailMessage("");
        loadSelectedItemToForm();
        refreshDetailProgress();
        openModal("itemDetailModal");
    }

    function loadSelectedItemToForm() {
        const item = findSelectedItem();
        if (!item) {
            return;
        }
        document.getElementById("detailName").value = item.name;
        document.getElementById("detailSubtitle").value = item.subtitle || "";
        document.getElementById("detailImage").value = item.image;
        document.getElementById("detailPrice").value = item.price;
        document.getElementById("detailDescription").value = item.description || "";
        renderExtraImages(item.extraImages || []);
    }

    function refreshDetailProgress() {
        const item = findSelectedItem();
        if (!item) {
            return;
        }

        const balance = getUserBalance(user.username);
        const price = clampMoney(document.getElementById("detailPrice").value || item.price);
        const percentageRaw = price > 0 ? (balance / price) * 100 : 0;
        const percentage = Math.min(100, Math.max(0, percentageRaw));
        const text = percentage >= 100 ? "You can buy this item now." : `${percentage.toFixed(1)}% collected`;

        document.getElementById("detailProgressBar").style.width = `${percentage}%`;
        document.getElementById("detailProgressText").innerHTML =
            percentage >= 100 ? `<span class='can-buy'>${text}</span>` : text;
    }

    document.getElementById("detailPrice").addEventListener("input", refreshDetailProgress);

    function saveItemDetails() {
        const items = getUserItems(user.username);
        const index = items.findIndex((item) => item.id === selectedItemId);
        if (index === -1) {
            return;
        }

        const updated = {
            ...items[index],
            name: document.getElementById("detailName").value.trim(),
            subtitle: document.getElementById("detailSubtitle").value.trim(),
            image: document.getElementById("detailImage").value.trim(),
            price: clampMoney(document.getElementById("detailPrice").value),
            description: document.getElementById("detailDescription").value.trim()
        };

        if (!updated.name || !updated.image || !updated.price) {
            setDetailMessage("Name, image, and price are required.");
            return;
        }

        if (!isWithinWordLimit(updated.description, 1000)) {
            setDetailMessage("Description is too long. Maximum 1000 words.");
            return;
        }

        items[index] = updated;
        saveUserItems(user.username, items);
        setDetailMessage("Item updated successfully.");
        renderItems();
        refreshDetailProgress();
    }

    function addExtraImageToSelectedItem() {
        const input = document.getElementById("extraImageInput");
        const url = input.value.trim();
        if (!url) {
            setDetailMessage("Enter an image URL first.");
            return;
        }

        const items = getUserItems(user.username);
        const index = items.findIndex((item) => item.id === selectedItemId);
        if (index === -1) {
            return;
        }

        const extraImages = items[index].extraImages || [];
        if (extraImages.length >= 5) {
            setDetailMessage("Only 5 extra images are allowed.");
            return;
        }

        extraImages.push(url);
        items[index].extraImages = extraImages;
        saveUserItems(user.username, items);
        input.value = "";
        renderExtraImages(extraImages);
        setDetailMessage("Extra image added.");
    }

    function renderExtraImages(extraImages) {
        const list = document.getElementById("extraImagesList");
        if (!extraImages.length) {
            list.innerHTML = "<p class='buy-status'>No extra images yet.</p>";
            return;
        }

        list.innerHTML = extraImages
            .map(
                (img, index) => `
                    <div class="extra-thumb">
                        <img src="${escapeHtml(img)}" alt="Extra image ${index + 1}">
                        <button type="button" class="remove-extra" data-extra-index="${index}">x</button>
                    </div>
                `
            )
            .join("");

        const removeButtons = list.querySelectorAll(".remove-extra");
        removeButtons.forEach((button) => {
            button.addEventListener("click", () => removeExtraImage(Number(button.dataset.extraIndex)));
        });
    }

    function removeExtraImage(indexToRemove) {
        const items = getUserItems(user.username);
        const index = items.findIndex((item) => item.id === selectedItemId);
        if (index === -1) {
            return;
        }

        items[index].extraImages = (items[index].extraImages || []).filter((_, index) => index !== indexToRemove);
        saveUserItems(user.username, items);
        renderExtraImages(items[index].extraImages);
    }

    function deleteSelectedItem() {
        const items = getUserItems(user.username);
        const next = items.filter((item) => item.id !== selectedItemId);
        saveUserItems(user.username, next);
        closeModal("itemDetailModal");
        renderItems();
    }

    function findSelectedItem() {
        const items = getUserItems(user.username);
        return items.find((item) => item.id === selectedItemId);
    }
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) {
        return;
    }
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) {
        return;
    }
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
}

function setAuthMessage(message) {
    const node = document.getElementById("authMessage");
    if (node) {
        node.textContent = message;
    }
}

function setItemMessage(message) {
    const node = document.getElementById("itemFormMessage");
    if (node) {
        node.textContent = message;
    }
}

function setDetailMessage(message) {
    const node = document.getElementById("detailMessage");
    if (node) {
        node.textContent = message;
    }
}

function getUsers() {
    return readJson(STORAGE_KEYS.USERS, []);
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function getSessionUser() {
    const username = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (!username) {
        return null;
    }
    const users = getUsers();
    return users.find((user) => user.username === username) || null;
}

function setSessionUser(username) {
    localStorage.setItem(STORAGE_KEYS.SESSION, username);
}

function clearSessionUser() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
}

function getUserItemsKey(username) {
    return `goalTrackerItems_${username}`;
}

function getUserBalanceKey(username) {
    return `goalTrackerBalance_${username}`;
}

function ensureUserDataDefaults(username) {
    if (!localStorage.getItem(getUserItemsKey(username))) {
        localStorage.setItem(getUserItemsKey(username), JSON.stringify([]));
    }
    if (!localStorage.getItem(getUserBalanceKey(username))) {
        localStorage.setItem(getUserBalanceKey(username), "0");
    }
}

function getUserItems(username) {
    ensureUserDataDefaults(username);
    return readJson(getUserItemsKey(username), []);
}

function saveUserItems(username, items) {
    localStorage.setItem(getUserItemsKey(username), JSON.stringify(items));
}

function getUserBalance(username) {
    ensureUserDataDefaults(username);
    return clampMoney(localStorage.getItem(getUserBalanceKey(username)));
}

function saveUserBalance(username, balance) {
    localStorage.setItem(getUserBalanceKey(username), String(clampMoney(balance)));
}

function readJson(key, fallback) {
    const value = localStorage.getItem(key);
    if (!value) {
        return fallback;
    }
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function clampMoney(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        return 0;
    }
    return Number(numeric.toFixed(2));
}

function formatMoney(value) {
    return `LKR ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isWithinWordLimit(text, limit) {
    if (!text.trim()) {
        return true;
    }
    return text.trim().split(/\s+/).length <= limit;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
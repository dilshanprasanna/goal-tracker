// දැනට තාවකාලිකව item එකක් list එකේ තියමු
let myItems = [
    {
        name: "MacBook Pro",
        price: 450000,
        image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=500&q=80"
    }
];

// පිටුව load වෙද්දී items පෙන්වන්න
window.onload = function() {
    displayItems();
};

function displayItems() {
    const grid = document.getElementById('itemsGrid');
    const balance = document.getElementById('accountBalance').value || 0;
    
    grid.innerHTML = ''; // කලින් තිබ්බ ඒවා අයින් කරන්න

    myItems.forEach((item, index) => {
        // Percentage එක ගණනය කිරීම
        let percentage = (balance / item.price) * 100;
        if (percentage > 100) percentage = 100; // 100% ට වඩා යන්න දෙන්න එපා bar එකේ

        let statusText = percentage >= 100 ? 
            '<span class="can-buy">🔥 You can buy this item!</span>' : 
            `${Math.floor(percentage)}% Collected`;

        grid.innerHTML += `
            <div class="item-card">
                <img src="${item.image}" class="card-img">
                <div class="card-details">
                    <h3>${item.name}</h3>
                    <p>Price: LKR ${item.price.toLocaleString()}</p>
                    
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${percentage}%"></div>
                    </div>
                    
                    <span class="buy-status">${statusText}</span>
                </div>
            </div>
        `;
    });
}

// Balance එක type කරද්දී cards update කරන function එක
function updateAllCards() {
    displayItems();
}
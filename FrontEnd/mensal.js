// mensal.js - Funções para a página Mensal

// Carregar dados do localStorage
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let categories = JSON.parse(localStorage.getItem('categories')) || ['Alimentação', 'Transporte', 'Lazer', 'Custos Fixos', 'Saúde e Bem-estar', 'Renda', 'Outros'];

let chartBarInstance = null;

function updateTransactionList() {
    const list = document.getElementById('lista-transacoes');
    list.innerHTML = '';

    const sorted = transactions.slice().sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach((t) => {
        const originalIndex = transactions.indexOf(t);
        const item = document.createElement('div');
        item.className = 'item';
        item.setAttribute('data-type', t.type);
        item.setAttribute('data-cat', t.category);

        const date = new Date(t.date).toLocaleDateString('pt-BR');

        item.innerHTML = `
            <span class="trans-date">${date}</span>
            <div class="trans-details">
                <p class="trans-name">${t.name}</p>
                <small class="trans-category">${t.category} • ${t.paymentType}</small>
            </div>
            <span class="trans-value ${t.type === 'entrada' ? 'green' : 'red'}">${t.type === 'entrada' ? '+' : '-'} R$ ${Math.abs(t.value).toFixed(2)}</span>
            <div class="trans-actions">
                <button class="btn-edit" data-index="${originalIndex}">Editar</button>
                <button class="btn-remove" data-index="${originalIndex}">Remover</button>
            </div>
        `;

        list.appendChild(item);
    });

    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            editTransaction(index);
        });
    });

    document.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            if (confirm('Tem certeza que deseja remover este lançamento?')) {
                removeTransaction(index);
            }
        });
    });

    updateBalance();
}

function updateBarChart() {
    const categoryTotals = {};
    transactions.forEach(t => {
        if (t.type === 'saida') {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.value);
        }
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const colors = ['#2ea043', '#58a6ff', '#f85149', '#ffbd2e', '#8b949e'];

    if (chartBarInstance) {
        chartBarInstance.data.labels = labels;
        chartBarInstance.data.datasets[0].data = data;
        chartBarInstance.data.datasets[0].backgroundColor = colors.slice(0, labels.length);
        chartBarInstance.update();
    }
}

function updateCardTransactions() {
    const cardContainer = document.getElementById('cartao-transacoes');
    if (!cardContainer) return;
    cardContainer.innerHTML = '';

    const cardItems = transactions
        .filter(t => t.paymentType && t.paymentType.toLowerCase().includes('cartão'))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    let totalCard = 0;

    cardItems.forEach((t) => {
        const item = document.createElement('div');
        item.className = 'item';

        const date = new Date(t.date).toLocaleDateString('pt-BR');

        item.innerHTML = `
            <span class="trans-date">${date}</span>
            <div class="trans-details">
                <p class="trans-name">${t.name}</p>
                <small class="trans-category">${t.category} • ${t.paymentType}</small>
            </div>
            <span class="trans-value ${t.type === 'entrada' ? 'green' : 'red'}">${t.type === 'entrada' ? '+' : '-'} R$ ${Math.abs(t.value).toFixed(2)}</span>
        `;

        if (t.type === 'saida') {
            totalCard += Math.abs(t.value);
        } else {
            totalCard -= Math.abs(t.value);
        }

        cardContainer.appendChild(item);
    });

    const cardInvoiceEl = document.getElementById('card-invoice-value');
    if (cardInvoiceEl) {
        cardInvoiceEl.textContent = `R$ ${totalCard.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        cardInvoiceEl.style.color = totalCard <= 0 ? 'var(--success)' : 'var(--danger)';
    }
}

function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function updateBalance() {
    const visibleItems = document.querySelectorAll('#lista-transacoes .item:not([style*="display: none"])');
    let total = 0;

    visibleItems.forEach(item => {
        const valueText = item.querySelector('.trans-value').textContent;
        const isPositive = valueText.includes('+');
        const value = parseFloat(valueText.replace(/[^\d.,]/g, '').replace(',', '.'));
        total += isPositive ? value : -value;
    });

    const balanceElement = document.getElementById('balance-summary');
    balanceElement.textContent = `Balanço: R$ ${total.toFixed(2)}`;
    balanceElement.style.color = total >= 0 ? 'var(--success)' : 'var(--danger)';
}

function editTransaction(index) {
    // marcar edição via localStorage e ir para dashboard para edição completa
    localStorage.setItem('editTransactionIndex', index);
    localStorage.setItem('editSource', 'mensal');
    window.location.href = 'dashboard_inicio.html';
}

function removeTransaction(index) {
    if (index >= 0 && index < transactions.length) {
        transactions.splice(index, 1);
        saveTransactions();
        updateTransactionList();
        updateCardTransactions();
        updateBarChart();
        updateBalance();
    }
}

function populateCategorySelect() {
    const select = document.getElementById('filter-category');
    select.innerHTML = '<option value="todas">Todas as categorias</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

const ctxBar = document.getElementById('graficoBarrasMensal').getContext('2d');
chartBarInstance = new Chart(ctxBar, {
    type: 'bar',
    data: {
        labels: [],
        datasets: [{
            label: 'Gastos (R$)',
            data: [],
            backgroundColor: [],
            borderRadius: 5
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: { beginAtZero: true, grid: { color: '#30363d' }, ticks: { color: '#8b949e' } },
            x: { grid: { display: false }, ticks: { color: '#8b949e' } }
        },
        plugins: { legend: { display: false } }
    }
});

const selectTipo = document.getElementById('filter-type');
const selectCategoria = document.getElementById('filter-category');

function aplicarFiltros() {
    const valorTipo = selectTipo.value;
    const valorCategoria = selectCategoria.value;

    const itensTransacao = document.querySelectorAll('#lista-transacoes .item');

    itensTransacao.forEach(item => {
        const tipoItem = item.getAttribute('data-type');
        const catItem = item.getAttribute('data-cat');

        const bateTipo = (valorTipo === 'todos' || tipoItem === valorTipo);
        const bateCat = (valorCategoria === 'todas' || catItem === valorCategoria);

        item.style.display = (bateTipo && bateCat) ? 'grid' : 'none';
    });

    updateBalance();
}

selectTipo.addEventListener('change', aplicarFiltros);
selectCategoria.addEventListener('change', aplicarFiltros);

// Inicializar
updateTransactionList();
updateCardTransactions();
updateBarChart();
populateCategorySelect();

// dashboard.js - Funções para o dashboard de finanças pessoais

// Carregar dados do localStorage ou usar iniciais
let transactions = JSON.parse(localStorage.getItem('transactions')) || [
    { name: 'Supermercado BH', category: 'Alimentação', value: -250, type: 'saida', date: '2026-01-15', paymentType: 'Cartão de Crédito' },
    { name: 'Salário Empresa', category: 'Renda', value: 5315, type: 'entrada', date: '2026-01-14', paymentType: 'PIX' },
    { name: 'Posto Ipiranga', category: 'Transporte', value: -180, type: 'saida', date: '2026-01-12', paymentType: 'Débito' },
    { name: 'Netflix', category: 'Lazer', value: -55.90, type: 'saida', date: '2026-01-10', paymentType: 'Cartão de Crédito' }
];

let chartInstance = null;
let editingIndex = -1;
let editSource = null;
let categories = JSON.parse(localStorage.getItem('categories')) || ['Alimentação', 'Transporte', 'Lazer', 'Custos Fixos', 'Saúde e Bem-estar', 'Renda', 'Outros'];

// Salvar no localStorage
function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function loadPendingEdit() {
    const indexStr = localStorage.getItem('editTransactionIndex');
    const source = localStorage.getItem('editSource');

    if (indexStr !== null) {
        const idx = parseInt(indexStr);
        if (!isNaN(idx) && idx >= 0 && idx < transactions.length) {
            editingIndex = idx;
            editSource = source;

            const t = transactions[idx];
            document.getElementById('trans-name').value = t.name;
            document.getElementById('trans-category').value = t.category;
            document.getElementById('trans-value').value = Math.abs(t.value);
            document.getElementById('trans-date').value = t.date;
            document.getElementById('trans-payment').value = t.paymentType;
            document.querySelector(`input[name="trans-type"][value="${t.type}"]`).checked = true;

            // Handle category select
            const categorySelect = document.getElementById('trans-category');
            const newCategoryInput = document.getElementById('new-category');
            if (categories.includes(t.category)) {
                categorySelect.value = t.category;
                newCategoryInput.style.display = 'none';
                newCategoryInput.required = false;
            } else {
                categorySelect.value = 'Outros';
                newCategoryInput.value = t.category;
                newCategoryInput.style.display = 'block';
                newCategoryInput.required = true;
            }

            const btn = document.querySelector('.btn-add');
            if (btn) btn.textContent = 'Salvar alterações';
        }

        localStorage.removeItem('editTransactionIndex');
        localStorage.removeItem('editSource');
    }
}

// Função para inicializar o gráfico
function initChart() {
    const ctx = document.getElementById('meuGraficoPizza').getContext('2d');

    const percentLabelPlugin = {
        id: 'percentLabelPlugin',
        afterDatasetsDraw(chart) {
            const { ctx, data, chartArea } = chart;
            const dataset = data.datasets[0];
            const total = dataset.data.reduce((sum, value) => sum + value, 0);

            if (total <= 0) return;

            chart.getDatasetMeta(0).data.forEach((arc, index) => {
                const value = dataset.data[index];
                if (value <= 0) return;

                const percent = (value / total * 100).toFixed(1) + '%';
                const angle = (arc.startAngle + arc.endAngle) / 2;
                const radius = (arc.outerRadius + arc.innerRadius) / 2;
                const x = arc.x + Math.cos(angle) * radius;
                const y = arc.y + Math.sin(angle) * radius;

                ctx.save();
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Segoe UI';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(percent, x, y);
                ctx.restore();
            });

            // fique com o total no centro do gráfico
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Segoe UI';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const centerX = (chartArea.left + chartArea.right) / 2;
            const centerY = (chartArea.top + chartArea.bottom) / 2;
            ctx.fillText(`Total: R$${total.toFixed(2)}`, centerX, centerY);
            ctx.restore();
        }
    };

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        plugins: [percentLabelPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#8b949e',
                        padding: 20,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw || 0;
                            const total = context.chart._metasets[context.datasetIndex].total;
                            const percent = total > 0 ? (value / total * 100).toFixed(1) : 0;
                            return `${context.label}: R$ ${value.toFixed(2)} (${percent}%)`;
                        }
                    }
                }
            },
            cutout: '50%'
        }
    });
}

function getColorForCategory(category, index) {
    const palette = ['#2ea043', '#58a6ff', '#f85149', '#ffbd2e', '#8b949e', '#b392f0', '#38bdf8', '#f97316'];
    return palette[index % palette.length];
}

// Função para atualizar o gráfico com base nos dados atuais
function updateChart() {
    const categoryTotals = {};
    transactions.forEach(t => {
        if (t.type === 'saida') {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Math.abs(t.value);
        }
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const colors = labels.map((cat, index) => getColorForCategory(cat, index));

    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.data.datasets[0].backgroundColor = colors;
    chartInstance.update();
}

// Função para atualizar a lista de últimos lançamentos
function updateTransactionsList() {
    const list = document.querySelector('.transactions-list');
    list.innerHTML = '';

    // Pegar os últimos 4 lançamentos
    const recent = transactions.slice(-4).reverse();

    recent.forEach((t, index) => {
        const item = document.createElement('div');
        item.className = 'transaction-item';

        const icon = t.type === 'entrada' ? '⬆' : '⬇';
        const iconClass = t.type === 'entrada' ? 'icon-up' : 'icon-down';
        const valueClass = t.type === 'entrada' ? 'text-green' : 'text-red';
        const sign = t.type === 'entrada' ? '+' : '-';

        item.innerHTML = `
            <div class="trans-info">
                <span class="trans-icon ${iconClass}">${icon}</span>
                <div>
                    <p class="trans-name">${t.name}</p>
                    <small class="trans-category">${t.category} • ${t.paymentType}</small>
                </div>
            </div>
            <span class="trans-value ${valueClass}">${sign} R$ ${Math.abs(t.value).toFixed(2)}</span>
        `;

        list.appendChild(item);
    });
}

// Função para calcular e atualizar os totais
function updateTotals() {
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach(t => {
        if (t.type === 'entrada') {
            totalIncome += t.value;
        } else {
            totalExpenses += Math.abs(t.value);
        }
    });

    const surplus = totalIncome - totalExpenses;

    // Atualizar cards
    document.querySelector('.card:nth-child(1) .main-value').textContent = `R$ ${totalIncome.toFixed(2)}`;
    document.querySelector('.card:nth-child(2) .main-value').textContent = `R$ ${totalExpenses.toFixed(2)}`;
    document.querySelector('.card:nth-child(3) .main-value').textContent = `R$ ${surplus.toFixed(2)}`;

    // Atualizar progresso (simulação)
    const progressPercent = Math.min((surplus / 2000) * 100, 100); // Meta de R$ 2000
    document.querySelector('.progress-bar').style.width = `${progressPercent}%`;
    document.querySelector('.card:nth-child(3) small').textContent = `Progresso da Meta: ${progressPercent.toFixed(0)}%`;
}

// Função para popular o select de categorias
function populateCategorySelect() {
    const select = document.getElementById('trans-category');
    // Clear existing options except the first
    select.innerHTML = '<option value="">Selecione</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
    // Add "Outros" option
    const outrosOption = document.createElement('option');
    outrosOption.value = 'Outros';
    outrosOption.textContent = 'Outros';
    select.appendChild(outrosOption);
}

// Função para adicionar novo lançamento
function addTransaction(name, category, value, type, date, paymentType) {
    const transaction = {
        name,
        category,
        value: type === 'entrada' ? parseFloat(value) : -parseFloat(value),
        type,
        date,
        paymentType
    };

    transactions.push(transaction);
    saveTransactions();

    updateChart();
    updateTransactionsList();
    updateTotals();
}

// Event listener para o formulário
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    loadPendingEdit();
    populateCategorySelect();
    updateChart();
    updateTransactionsList();
    updateTotals();

    // Event listener for category select
    document.getElementById('trans-category').addEventListener('change', function() {
        const newCategoryInput = document.getElementById('new-category');
        if (this.value === 'Outros') {
            newCategoryInput.style.display = 'block';
            newCategoryInput.required = true;
        } else {
            newCategoryInput.style.display = 'none';
            newCategoryInput.required = false;
            newCategoryInput.value = '';
        }
    });

    const form = document.getElementById('add-transaction-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('trans-name').value;
            let category = document.getElementById('trans-category').value;
            if (category === 'Outros') {
                category = document.getElementById('new-category').value.trim();
                if (!category) {
                    alert('Por favor, digite a nova categoria.');
                    return;
                }
            }
            const value = document.getElementById('trans-value').value;
            const type = document.querySelector('input[name="trans-type"]:checked').value;
            const date = document.getElementById('trans-date').value;
            const paymentType = document.getElementById('trans-payment').value;

            if (name && category && value && date) {
                const cameFromMensal = editSource === 'mensal';

                if (editingIndex !== -1) {
                    // Atualizar transação existente
                    transactions[editingIndex] = {
                        name,
                        category,
                        value: type === 'entrada' ? parseFloat(value) : -parseFloat(value),
                        type,
                        date,
                        paymentType
                    };
                    editingIndex = -1;
                    editSource = null;
                    const btn = document.querySelector('.btn-add');
                    btn.textContent = 'Adicionar Lançamento';
                } else {
                    // Adicionar nova transação
                    addTransaction(name, category, value, type, date, paymentType);
                }
                // Verificar se categoria é nova
                if (!categories.includes(category)) {
                    categories.push(category);
                    localStorage.setItem('categories', JSON.stringify(categories));
                    populateCategorySelect(); // Atualizar select
                }
                form.reset();
                saveTransactions();
                updateChart();
                updateTransactionsList();
                updateTotals();

                if (cameFromMensal) {
                    window.location.href = 'mensal.html';
                    return;
                }
            }
        });
    }
});
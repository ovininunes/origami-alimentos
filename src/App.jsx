import React, { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import {
  LayoutDashboard, Package, Utensils, DollarSign, LogOut, Plus, Trash2,
  AlertTriangle, CheckCircle2, Clock, Download, Calculator, ShoppingCart,
  TrendingUp, Bell, Layers, Calendar, X
} from 'lucide-react'

const SENHA_SISTEMA = 'origami2026'
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const lerLocal = (chave) => {
  try { return JSON.parse(localStorage.getItem(chave) || '[]') } catch { return [] }
}

export default function App() {
  const [autenticado, setAutenticado] = useState(() => localStorage.getItem('origami_auth') === 'ok')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const [aba, setAba] = useState('dashboard')
  const [insumos, setInsumos] = useState(() => lerLocal('origami_insumos'))
  const [produtos, setProdutos] = useState(() => lerLocal('origami_produtos'))
  const [fichas, setFichas] = useState(() => lerLocal('origami_fichas'))
  const [financeiro, setFinanceiro] = useState(() => lerLocal('origami_financeiro'))

  useEffect(() => { localStorage.setItem('origami_insumos', JSON.stringify(insumos)) }, [insumos])
  useEffect(() => { localStorage.setItem('origami_produtos', JSON.stringify(produtos)) }, [produtos])
  useEffect(() => { localStorage.setItem('origami_fichas', JSON.stringify(fichas)) }, [fichas])
  useEffect(() => { localStorage.setItem('origami_financeiro', JSON.stringify(financeiro)) }, [financeiro])

  const [novoInsumo, setNovoInsumo] = useState({
    nome: '', unidade: 'kg', preco_compra: '', qtd_embalagem: '1', estoque_atual: '', estoque_minimo: ''
  })

  const [novoProduto, setNovoProduto] = useState({
    nome: '', categoria: 'Produção Própria', rendimento_receita: '1', preco_venda: '', estoque_atual: '0'
  })

  const [produtoSelecionado, setProdutoSelecionado] = useState(() => lerLocal('origami_produtos')[0]?.id || '')
  const [itemReceita, setItemReceita] = useState({ insumo_id: '', quantidade: '' })
  const [vendaForm, setVendaForm] = useState({ produto_id: '', quantidade: '1' })

  const [novoFin, setNovoFin] = useState({
    tipo: 'despesa', descricao: '', categoria: 'Insumos', valor: '',
    data_vencimento: new Date().toISOString().split('T')[0], status: 'pendente'
  })

  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [modalPendentesAberto, setModalPendentesAberto] = useState(false)

  function handleLogin(e) {
    e.preventDefault()
    setAuthError('')
    if (password.trim() === SENHA_SISTEMA) {
      localStorage.setItem('origami_auth', 'ok')
      setAutenticado(true)
    } else {
      setAuthError('Senha incorreta. Tente novamente.')
    }
  }

  function handleLogout() {
    localStorage.removeItem('origami_auth')
    setAutenticado(false)
    setPassword('')
  }

  const produtosCalculados = useMemo(() => {
    return produtos.map((prod) => {
      const itens = fichas.filter((f) => f.produto_id === prod.id)
      const custoReceita = itens.reduce((acc, item) => {
        const ins = insumos.find((i) => i.id === item.insumo_id)
        if (!ins || Number(ins.qtd_embalagem) === 0) return acc
        const custoUnitInsumo = Number(ins.preco_compra) / Number(ins.qtd_embalagem)
        return acc + custoUnitInsumo * Number(item.quantidade)
      }, 0)
      const rendimento = Number(prod.rendimento_receita) || 1
      const custoMedioUnitario = custoReceita / rendimento
      const precoVenda = Number(prod.preco_venda) || 0
      const lucroUnitario = precoVenda - custoMedioUnitario
      const margem = precoVenda > 0 ? (lucroUnitario / precoVenda) * 100 : 0

      return { ...prod, custoReceita, custoMedioUnitario, lucroUnitario, margem, itens }
    })
  }, [produtos, fichas, insumos])

  const lembretesVencimento = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const limite = new Date(hoje)
    limite.setDate(hoje.getDate() + 3)

    return financeiro.filter((f) => {
      if (f.status !== 'pendente') return false
      const [ano, mes, dia] = f.data_vencimento.split('-').map(Number)
      const dt = new Date(ano, mes - 1, dia)
      return dt <= limite
    })
  }, [financeiro])

  const todasPendentes = useMemo(() => {
    return financeiro
      .filter((f) => f.status === 'pendente')
      .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))
  }, [financeiro])

  const insumosBaixos = useMemo(() => {
    return insumos.filter((i) => Number(i.estoque_atual) <= Number(i.estoque_minimo))
  }, [insumos])

  const financeiroFiltrado = useMemo(() => {
    return financeiro.filter((item) => {
      if (filtroDataInicio && item.data_vencimento < filtroDataInicio) return false
      if (filtroDataFim && item.data_vencimento > filtroDataFim) return false
      return true
    })
  }, [financeiro, filtroDataInicio, filtroDataFim])

  const resumoPeriodo = useMemo(() => {
    const receitas = financeiroFiltrado.filter((f) => f.tipo === 'receita').reduce((a, b) => a + Number(b.valor), 0)
    const despesas = financeiroFiltrado.filter((f) => f.tipo === 'despesa').reduce((a, b) => a + Number(b.valor), 0)
    return { receitas, despesas, saldo: receitas - despesas }
  }, [financeiroFiltrado])

  const resumo = useMemo(() => {
    const receitasPagas = financeiro.filter((f) => f.tipo === 'receita' && f.status === 'pago').reduce((a, b) => a + Number(b.valor), 0)
    const despesasPagas = financeiro.filter((f) => f.tipo === 'despesa' && f.status === 'pago').reduce((a, b) => a + Number(b.valor), 0)
    const aPagar = financeiro.filter((f) => f.tipo === 'despesa' && f.status === 'pendente').reduce((a, b) => a + Number(b.valor), 0)
    const aReceber = financeiro.filter((f) => f.tipo === 'receita' && f.status === 'pendente').reduce((a, b) => a + Number(b.valor), 0)

    const porMes = {}
    financeiro.forEach((f) => {
      const mes = f.data_vencimento.slice(0, 7)
      if (!porMes[mes]) porMes[mes] = { mes, Receitas: 0, Despesas: 0 }
      if (f.tipo === 'receita') porMes[mes].Receitas += Number(f.valor)
      else porMes[mes].Despesas += Number(f.valor)
    })

    return {
      receitasPagas, despesasPagas, saldo: receitasPagas - despesasPagas, aPagar, aReceber,
      grafico: Object.values(porMes).sort((a, b) => a.mes.localeCompare(b.mes))
    }
  }, [financeiro])

  function adicionarInsumo(e) {
    e.preventDefault()
    if (!novoInsumo.nome) return
    const item = {
      id: crypto.randomUUID(),
      nome: novoInsumo.nome,
      unidade: novoInsumo.unidade,
      preco_compra: Number(novoInsumo.preco_compra || 0),
      qtd_embalagem: Number(novoInsumo.qtd_embalagem || 1),
      estoque_atual: Number(novoInsumo.estoque_atual || 0),
      estoque_minimo: Number(novoInsumo.estoque_minimo || 0)
    }
    setInsumos((prev) => [...prev, item].sort((a, b) => a.nome.localeCompare(b.nome)))
    setNovoInsumo({ nome: '', unidade: 'kg', preco_compra: '', qtd_embalagem: '1', estoque_atual: '', estoque_minimo: '' })
  }

  function adicionarProduto(e) {
    e.preventDefault()
    if (!novoProduto.nome) return
    const item = {
      id: crypto.randomUUID(),
      nome: novoProduto.nome,
      categoria: novoProduto.categoria,
      rendimento_receita: Number(novoProduto.rendimento_receita || 1),
      preco_venda: Number(novoProduto.preco_venda || 0),
      estoque_atual: Number(novoProduto.estoque_atual || 0)
    }
    setProdutos((prev) => [...prev, item].sort((a, b) => a.nome.localeCompare(b.nome)))
    setNovoProduto({ nome: '', categoria: 'Produção Própria', rendimento_receita: '1', preco_venda: '', estoque_atual: '0' })
    setProdutoSelecionado(item.id)
  }

  function adicionarItemFicha(e) {
    e.preventDefault()
    if (!produtoSelecionado || !itemReceita.insumo_id || !itemReceita.quantidade) return
    const item = {
      id: crypto.randomUUID(),
      produto_id: produtoSelecionado,
      insumo_id: itemReceita.insumo_id,
      quantidade: Number(itemReceita.quantidade)
    }
    setFichas((prev) => [...prev, item])
    setItemReceita({ insumo_id: '', quantidade: '' })
  }

  function registrarProducao(prod) {
    const itens = fichas.filter((f) => f.produto_id === prod.id)
    setInsumos((prev) => prev.map((ins) => {
      const usado = itens.find((i) => i.insumo_id === ins.id)
      if (!usado) return ins
      return { ...ins, estoque_atual: Math.max(0, Number(ins.estoque_atual) - Number(usado.quantidade)) }
    }))
    setProdutos((prev) => prev.map((p) =>
      p.id === prod.id ? { ...p, estoque_atual: Number(p.estoque_atual) + Number(prod.rendimento_receita) } : p
    ))
  }

  function registrarVenda(e) {
    e.preventDefault()
    const prod = produtosCalculados.find((p) => p.id === vendaForm.produto_id)
    if (!prod) return
    const qtd = Number(vendaForm.quantidade || 1)
    const total = Number(prod.preco_venda) * qtd

    setFinanceiro((prev) => [...prev, {
      id: crypto.randomUUID(),
      tipo: 'receita',
      descricao: `Venda: ${qtd}x ${prod.nome}`,
      categoria: 'Vendas',
      valor: total,
      data_vencimento: new Date().toISOString().split('T')[0],
      status: 'pago'
    }])

    setProdutos((prev) => prev.map((p) =>
      p.id === prod.id ? { ...p, estoque_atual: Math.max(0, Number(p.estoque_atual) - qtd) } : p
    ))

    setVendaForm({ produto_id: '', quantidade: '1' })
  }

  function adicionarFinanceiro(e) {
    e.preventDefault()
    if (!novoFin.descricao || !novoFin.valor) return
    setFinanceiro((prev) => [...prev, {
      id: crypto.randomUUID(),
      tipo: novoFin.tipo,
      descricao: novoFin.descricao,
      categoria: novoFin.categoria,
      valor: Number(novoFin.valor),
      data_vencimento: novoFin.data_vencimento,
      status: novoFin.status
    }].sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)))
    setNovoFin({
      tipo: 'despesa', descricao: '', categoria: 'Insumos', valor: '',
      data_vencimento: new Date().toISOString().split('T')[0], status: 'pendente'
    })
  }

  function alternarStatusFin(item) {
    setFinanceiro((prev) => prev.map((f) =>
      f.id === item.id ? { ...f, status: f.status === 'pago' ? 'pendente' : 'pago' } : f
    ))
  }

  function exportarExcel() {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(produtosCalculados.map(p => ({
      Produto: p.nome,
      Rendimento: p.rendimento_receita,
      Custo_Receita: Number(p.custoReceita.toFixed(2)),
      Custo_Medio_Unitario: Number(p.custoMedioUnitario.toFixed(2)),
      Preco_Venda: Number(p.preco_venda),
      Lucro_Unitario: Number(p.lucroUnitario.toFixed(2)),
      Margem_Percentual: Number(p.margem.toFixed(1)),
      Estoque: p.estoque_atual
    }))), 'Produtos_Custos')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(insumos), 'Insumos')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(financeiro), 'Financeiro')
    XLSX.writeFile(wb, `Origami_Alimentos_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  if (!autenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EFE1D1] p-4">
        <div className="w-full max-w-md bg-[#FAF6F1] border-2 border-[#0A0A0A] rounded-2xl p-8 shadow-lg">
          <div className="flex flex-col items-center mb-6">
            <img src="/logo.jpeg" alt="Origami Alimentos" className="w-36 h-36 object-contain rounded-full mb-3 border-2 border-[#990F0F]" />
            <h1 className="text-2xl font-black tracking-tight text-[#0A0A0A]">ORIGAMI ALIMENTOS</h1>
            <p className="text-xs uppercase tracking-widest text-[#990F0F] font-bold mt-1">Gestão de Produção & Caixa</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#0A0A0A] mb-1">Senha de Acesso</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha da loja"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 focus:outline-none focus:border-[#990F0F]"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-[#990F0F]/10 border border-[#990F0F] text-[#990F0F] text-sm font-medium">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#990F0F] hover:bg-[#7A0B0B] text-white font-bold tracking-wide transition cursor-pointer"
            >
              ENTRAR NO SISTEMA
            </button>
          </form>
        </div>
      </div>
    )
  }

  const prodAtualFicha = produtosCalculados.find((p) => p.id === produtoSelecionado)

  return (
    <div className="min-h-screen bg-[#EFE1D1] text-[#0A0A0A] pb-20 md:pb-8">
      <header className="bg-[#FAF6F1] border-b-2 border-[#0A0A0A] sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="Origami" className="w-11 h-11 rounded-full object-cover border border-[#990F0F]" />
            <div>
              <h1 className="font-black text-lg leading-none tracking-tight">ORIGAMI ALIMENTOS</h1>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#990F0F]">Produção & Financeiro</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportarExcel}
              title="Baixar Backup Excel"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EFE1D1] hover:bg-[#E4D1BC] border border-[#0A0A0A]/20 text-xs font-bold cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#990F0F]" />
              <span className="hidden sm:inline">Backup Excel</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0A0A0A] text-white text-xs font-bold hover:bg-[#990F0F] transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        <nav className="hidden md:flex max-w-6xl mx-auto px-4 gap-2 pb-2">
          {[
            { id: 'dashboard', label: 'Visão Geral & Gráficos', icon: LayoutDashboard },
            { id: 'producao', label: 'Produtos & Custo Produção', icon: Utensils },
            { id: 'insumos', label: 'Insumos & Estoque', icon: Package },
            { id: 'financeiro', label: 'Vendas, Contas & Lembretes', icon: DollarSign },
          ].map((item) => {
            const Icon = item.icon
            const ativo = aba === item.id
            return (
              <button
                key={item.id}
                onClick={() => setAba(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                  ativo ? 'bg-[#990F0F] text-white' : 'hover:bg-[#EFE1D1] text-[#0A0A0A]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </header>

      {lembretesVencimento.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="bg-[#990F0F] text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">
                  Atenção: {lembretesVencimento.length} conta(s) vencendo hoje, atrasada(s) ou nos próximos 3 dias!
                </p>
                <p className="text-xs text-white/90 mt-0.5">
                  {lembretesVencimento.map(l => `${l.descricao} (${brl(l.valor)} - ${l.data_vencimento.split('-').reverse().join('/')})`).join(' • ')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setModalPendentesAberto(true)}
              className="px-3.5 py-2 bg-white text-[#990F0F] hover:bg-[#FAF6F1] rounded-xl text-xs font-black shrink-0 self-start sm:self-center cursor-pointer shadow-sm"
            >
              Ver Contas ({todasPendentes.length})
            </button>
          </div>
        </div>
      )}

      {modalPendentesAberto && (
        <div
          onClick={() => setModalPendentesAberto(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#FAF6F1] border-2 border-[#0A0A0A] rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="bg-[#990F0F] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <h3 className="font-black text-base">Contas & Lançamentos Pendentes</h3>
              </div>
              <button
                onClick={() => setModalPendentesAberto(false)}
                className="p-1 rounded-lg hover:bg-white/20 cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-2.5">
              {todasPendentes.length === 0 ? (
                <p className="text-sm text-[#0A0A0A]/70 text-center py-8 font-medium">
                  Nenhuma conta pendente no momento!
                </p>
              ) : (
                todasPendentes.map((item) => {
                  const isUrgente = lembretesVencimento.some((l) => l.id === item.id)
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                        isUrgente ? 'bg-[#990F0F]/5 border-[#990F0F]' : 'bg-white border-[#0A0A0A]/15'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            item.tipo === 'receita' ? 'bg-emerald-100 text-emerald-800' : 'bg-[#990F0F]/15 text-[#990F0F]'
                          }`}>
                            {item.tipo}
                          </span>
                          {isUrgente && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#990F0F] text-white">
                              Urgente / Vencendo
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-sm mt-1">{item.descricao}</p>
                        <p className="text-xs text-[#0A0A0A]/65">
                          Vencimento: <strong>{item.data_vencimento.split('-').reverse().join('/')}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className={`font-black text-sm ${item.tipo === 'receita' ? 'text-emerald-700' : 'text-[#990F0F]'}`}>
                          {brl(item.valor)}
                        </span>
                        <button
                          onClick={() => alternarStatusFin(item)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Dar Baixa
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="px-5 py-3 bg-[#EFE1D1] border-t border-[#0A0A0A]/15 flex items-center justify-between">
              <button
                onClick={() => { setModalPendentesAberto(false); setAba('financeiro') }}
                className="text-xs font-black text-[#990F0F] hover:underline cursor-pointer"
              >
                Ir para tela completa de Contas →
              </button>
              <button
                onClick={() => setModalPendentesAberto(false)}
                className="px-4 py-1.5 rounded-xl bg-[#0A0A0A] text-white text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {aba === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#FAF6F1] border border-[#0A0A0A]/20 rounded-2xl p-4">
                <span className="text-xs font-bold uppercase text-[#0A0A0A]/60">Saldo em Caixa</span>
                <p className={`text-2xl font-black mt-1 ${resumo.saldo >= 0 ? 'text-[#0A0A0A]' : 'text-[#990F0F]'}`}>
                  {brl(resumo.saldo)}
                </p>
              </div>
              <div className="bg-[#FAF6F1] border border-[#0A0A0A]/20 rounded-2xl p-4">
                <span className="text-xs font-bold uppercase text-[#0A0A0A]/60">Vendas Recebidas</span>
                <p className="text-2xl font-black mt-1 text-emerald-700">{brl(resumo.receitasPagas)}</p>
              </div>
              <div className="bg-[#FAF6F1] border border-[#0A0A0A]/20 rounded-2xl p-4">
                <span className="text-xs font-bold uppercase text-[#0A0A0A]/60">Despesas Pagas</span>
                <p className="text-2xl font-black mt-1 text-[#990F0F]">{brl(resumo.despesasPagas)}</p>
              </div>
              <div
                onClick={() => setModalPendentesAberto(true)}
                title="Clique para ver as contas pendentes"
                className="bg-[#FAF6F1] border-2 border-[#990F0F] rounded-2xl p-4 cursor-pointer hover:bg-[#990F0F]/5 transition"
              >
                <span className="text-xs font-bold uppercase text-[#990F0F]">Contas a Pagar (Ver)</span>
                <p className="text-2xl font-black mt-1 text-[#990F0F]">{brl(resumo.aPagar)}</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="bg-[#FAF6F1] border border-[#0A0A0A]/20 rounded-2xl p-5">
                <h2 className="font-black text-base flex items-center gap-2 mb-4">
                  <ShoppingCart className="w-5 h-5 text-[#990F0F]" /> Registrar Venda Rápida
                </h2>
                <form onSubmit={registrarVenda} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase">Produto</label>
                    <select
                      required value={vendaForm.produto_id}
                      onChange={(e) => setVendaForm({ ...vendaForm, produto_id: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 text-sm"
                    >
                      <option value="">Selecione um produto...</option>
                      {produtosCalculados.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} — {brl(p.preco_venda)} (Est: {p.estoque_atual})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase">Quantidade Vendida</label>
                    <input
                      type="number" min="1" step="1" required value={vendaForm.quantidade}
                      onChange={(e) => setVendaForm({ ...vendaForm, quantidade: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 text-sm"
                    />
                  </div>
                  <button type="submit" className="w-full py-2.5 rounded-xl bg-[#990F0F] text-white font-bold text-sm hover:bg-[#7A0B0B] cursor-pointer">
                    Lançar Venda no Caixa
                  </button>
                </form>

                {insumosBaixos.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-[#0A0A0A]/15">
                    <p className="text-xs font-black uppercase text-[#990F0F] flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-4 h-4" /> Insumos no Estoque Mínimo
                    </p>
                    <ul className="space-y-1 text-xs">
                      {insumosBaixos.map((i) => (
                        <li key={i.id} className="flex justify-between bg-white px-2.5 py-1.5 rounded-lg border border-[#990F0F]/30">
                          <span className="font-semibold">{i.nome}</span>
                          <span className="text-[#990F0F] font-bold">{i.estoque_atual} {i.unidade}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 bg-[#FAF6F1] border border-[#0A0A0A]/20 rounded-2xl p-5">
                <h2 className="font-black text-base flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-[#990F0F]" /> Receitas vs. Despesas por Mês
                </h2>
                {resumo.grafico.length === 0 ? (
                  <p className="text-sm text-[#0A0A0A]/60 py-12 text-center">Lance sua primeira venda ou despesa para visualizar o gráfico.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={resumo.grafico}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#0A0A0A15" />
                        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => brl(v)} />
                        <Legend />
                        <Bar dataKey="Receitas" fill="#15803d" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Despesas" fill="#990F0F" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#FAF6F1] border border-[#0A0A0A]/20 rounded-2xl p-5">
              <h2 className="font-black text-base mb-3">Resumo de Custo Médio de Produção & Margens</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase border-b border-[#0A0A0A]/20 text-[#0A0A0A]/70">
                    <tr>
                      <th className="py-2 pr-4">Produto</th>
                      <th className="py-2 px-3">Custo Médio Unit.</th>
                      <th className="py-2 px-3">Preço Venda</th>
                      <th className="py-2 px-3">Lucro Unit.</th>
                      <th className="py-2 pl-3">Margem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0A0A0A]/10">
                    {produtosCalculados.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 pr-4 font-bold">{p.nome}</td>
                        <td className="py-2.5 px-3 text-[#990F0F] font-semibold">{brl(p.custoMedioUnitario)}</td>
                        <td className="py-2.5 px-3 font-semibold">{brl(p.preco_venda)}</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-bold">{brl(p.lucroUnitario)}</td>
                        <td className="py-2.5 pl-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                            p.margem >= 40 ? 'bg-emerald-100 text-emerald-800' : 'bg-[#990F0F]/15 text-[#990F0F]'
                          }`}>
                            {p.margem.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {aba === 'producao' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-[#FAF6F1] border border-[#0A0A0A]/20 rounded-2xl p-5 space-y-4">
              <h2 className="font-black text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#990F0F]" /> Novo Produto Final
              </h2>
              <form onSubmit={adicionarProduto} className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold uppercase">Nome do Produto</label>
                  <input
                    required placeholder="Ex: Gyoza Suíno (Bandeja 12 un)" value={novoProduto.nome}
                    onChange={(e) => setNovoProduto({ ...novoProduto, nome: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase">Rendimento da Receita (un)</label>
                  <input
                    type="number" step="0.01" min="0.01" required value={novoProduto.rendimento_receita}
                    onChange={(e) => setNovoProduto({ ...novoProduto, rendimento_receita: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase">Preço de Venda (R$)</label>
                  <input
                    type="number" step="0.01" required placeholder="0,00" value={novoProduto.preco_venda}
                    onChange={(e) => setNovoProduto({ ...novoProduto, preco_venda: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <button type="submit" className="w-full py-2.5 rounded-xl bg-[#990F0F] text-white font-bold text-sm hover:bg-[#7A0B0B] cursor-pointer">
                    Salvar Produto
                  </button>
                </div>
              </form>

              <div className="pt-4 border-t border-[#0A0A0A]/15 space-y-2">
                <h3 className="text-xs font-black uppercase text-[#0A0A0A]/70">Produtos Cadastrados (Clique para editar receita)</h3>
                {produtosCalculados.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setProdutoSelecionado(p.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      produtoSelecionado === p.id ? 'bg-[#990F0F]/10 border-[#990F0F]' : 'bg-white border-[#0A0A0A]/15'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-sm">{p.nome}</p>
                      <p className="text-xs text-[#0A0A0A]/70">
                        Custo Médio: <strong className="text-[#990F0F]">{brl(p.custoMedioUnitario)}</strong> • Venda: <strong>{brl(p.preco_venda)}</strong> • Margem: <strong>{p.margem.toFixed(1)}%</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); registrarProducao(p) }}
                        title="Registrar 1 lote produzido (baixa insumos e soma estoque)"
                        className="px-2.5 py-1.5 rounded-lg bg-[#0A0A0A] text-white text-xs font-bold hover:bg-[#990F0F] cursor-pointer"
                      >
                        + Produzir ({p.rendimento_receita})
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setProdutos((prev) => prev.filter((item) => item.id !== p.id)) }}
                        className="p-1.5 text-[#990F0F] hover:bg-[#990F0F]/10 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#FAF6F1] border-2 border-[#0A0A0A] rounded-2xl p-5 space-y-4">
              <h2 className="font-black text-base flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#990F0F]" /> Ficha Técnica & Custo de Produção
              </h2>

              {!prodAtualFicha ? (
                <p className="text-sm text-[#0A0A0A]/60">Cadastre ou selecione um produto ao lado para montar a receita.</p>
              ) : (
                <>
                  <div className="p-3.5 rounded-xl bg-[#EFE1D1] border border-[#0A0A0A]/20 flex flex-wrap justify-between gap-2">
                    <div>
                      <span className="text-[11px] uppercase font-bold text-[#0A0A0A]/60">Produto Selecionado</span>
                      <p className="font-black text-base">{prodAtualFicha.nome}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] uppercase font-bold text-[#990F0F]">Custo Médio / Unidade</span>
                      <p className="font-black text-xl text-[#990F0F]">{brl(prodAtualFicha.custoMedioUnitario)}</p>
                    </div>
                  </div>

                  <form onSubmit={adicionarItemFicha} className="grid grid-cols-3 gap-2">
                    <select
                      required value={itemReceita.insumo_id}
                      onChange={(e) => setItemReceita({ ...itemReceita, insumo_id: e.target.value })}
                      className="col-span-2 p-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 text-sm"
                    >
                      <option value="">Escolher insumo...</option>
                      {insumos.map((i) => (
                        <option key={i.id} value={i.id}>{i.nome} ({i.unidade})</option>
                      ))}
                    </select>
                    <input
                      type="number" step="0.001" required placeholder="Qtd usada"
                      value={itemReceita.quantidade}
                      onChange={(e) => setItemReceita({ ...itemReceita, quantidade: e.target.value })}
                      className="p-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 text-sm"
                    />
                    <button type="submit" className="col-span-3 py-2 rounded-xl bg-[#990F0F] text-white font-bold text-xs uppercase cursor-pointer">
                      + Adicionar Ingrediente / Embalagem na Receita
                    </button>
                  </form>

                  <div className="space-y-2">
                    {prodAtualFicha.itens.map((item) => {
                      const ins = insumos.find((i) => i.id === item.insumo_id)
                      const custoItem = ins ? (Number(ins.preco_compra) / Number(ins.qtd_embalagem)) * Number(item.quantidade) : 0
                      return (
                        <div key={item.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-[#0A0A0A]/15 text-sm">
                          <div>
                            <span className="font-bold">{ins?.nome || 'Insumo'}</span>
                            <span className="text-xs text-[#0A0A0A]/60 ml-2">
                              ({item.quantidade} {ins?.unidade})
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-[#990F0F]">{brl(custoItem)}</span>
                            <button
                              onClick={() => setFichas((prev) => prev.filter((f) => f.id !== item.id))}
                              className="text-[#0A0A0A]/50 hover:text-[#990F0F] cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="pt-3 border-t border-[#0A0A0A]/15 text-xs flex justify-between text-[#0A0A0A]/80">
                    <span>Custo Total da Receita ({prodAtualFicha.rendimento_receita} un): <strong>{brl(prodAtualFicha.custoReceita)}</strong></span>
                    <span>Lucro Líquido/un: <strong className="text-emerald-700">{brl(prodAtualFicha.lucroUnitario)}</strong></span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {aba === 'insumos' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-[#FAF6F1] border border-[#0A0A0A]/20 rounded-2xl p-5">
              <h2 className="font-black text-base flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-[#990F0F]" /> Cadastrar Insumo / Embalagem
              </h2>
              <form onSubmit={adicionarInsumo} className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase">Nome do Insumo</label>
                  <input
                    required placeholder="Ex: Farinha de Trigo" value={novoInsumo.nome}
                    onChange={(e) => setNovoInsumo({ ...novoInsumo, nome: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold uppercase">Unidade</label>
                    <select
                      value={novoInsumo.unidade}
                      onChange={(e) => setNovoInsumo({ ...novoInsumo, unidade: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 text-sm"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="ml">ml</option>
                      <option value="un">un</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase">Qtd na Embalagem</label>
                    <input
                      type="number" step="0.001" required value={novoInsumo.qtd_embalagem}
                      onChange={(e) => setNovoInsumo({ ...novoInsumo, qtd_embalagem: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase">Preço Pago na Embalagem (R$)</label>
                  <input
                    type="number" step="0.01" required placeholder="0,00" value={novoInsumo.preco_compra}
                    onChange={(e) => setNovoInsumo({ ...novoInsumo, preco_compra: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold uppercase">Estoque Atual</label>
                    <input
                      type="number" step="0.001" value={novoInsumo.estoque_atual}
                      onChange={(e) => setNovoInsumo({ ...novoInsumo, estoque_atual: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase">Estoque Mínimo</label>
                    <input
                      type="number" step="0.001" value={novoInsumo.estoque_minimo}
                      onChange={(e) => setNovoInsumo({ ...novoInsumo, estoque_minimo: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 text-sm"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-2.5 rounded-xl bg-[#990F0F] text-white font-bold text-sm hover:bg-[#7A0B0B] cursor-pointer">
                  Salvar Insumo
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-[#FAF6F1] border border-[#0A0A0A]/20 rounded-2xl p-5">
              <h2 className="font-black text-base mb-4">Lista de Insumos & Custo Unitário</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase border-b border-[#0A0A0A]/20 text-[#0A0A0A]/70">
                    <tr>
                      <th className="py-2">Insumo</th>
                      <th className="py-2">Custo / Unid.</th>
                      <th className="py-2">Estoque</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0A0A0A]/10">
                    {insumos.map((i) => {
                      const unit = Number(i.preco_compra) / (Number(i.qtd_embalagem) || 1)
                      const baixo = Number(i.estoque_atual) <= Number(i.estoque_minimo)
                      return (
                        <tr key={i.id}>
                          <td className="py-2.5 font-bold">{i.nome}</td>
                          <td className="py-2.5 text-[#990F0F] font-semibold">{brl(unit)} / {i.unidade}</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${baixo ? 'bg-[#990F0F] text-white' : 'bg-white border border-[#0A0A0A]/15'}`}>
                              {i.estoque_atual} {i.unidade}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => setInsumos((prev) => prev.filter((item) => item.id !== i.id))}
                              className="text-[#0A0A0A]/50 hover:text-[#990F0F] cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {aba === 'financeiro' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-[#FAF6F1] border border-[#0A0A0A]/20 rounded-2xl p-5">
              <h2 className="font-black text-base mb-4">Novo Lançamento Financeiro</h2>
              <form onSubmit={adicionarFinanceiro} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNovoFin({ ...novoFin, tipo: 'despesa' })}
                    className={`py-2 rounded-xl text-xs font-black border cursor-pointer ${
                      novoFin.tipo === 'despesa' ? 'bg-[#990F0F] text-white border-[#990F0F]' : 'bg-white border-[#0A0A0A]/20'
                    }`}
                  >
                    DESPESA / CONTA
                  </button>
                  <button
                    type="button"
                    onClick={() => setNovoFin({ ...novoFin, tipo: 'receita' })}
                    className={`py-2 rounded-xl text-xs font-black border cursor-pointer ${
                      novoFin.tipo === 'receita' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white border-[#0A0A0A]/20'
                    }`}
                  >
                    RECEITA / VENDA
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase">Descrição</label>
                  <input
                    required placeholder="Ex: Energia elétrica / Compra embalagem" value={novoFin.descricao}
                    onChange={(e) => setNovoFin({ ...novoFin, descricao: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold uppercase">Valor (R$)</label>
                    <input
                      type="number" step="0.01" required value={novoFin.valor}
                      onChange={(e) => setNovoFin({ ...novoFin, valor: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase">Vencimento / Data</label>
                    <input
                      type="date" required value={novoFin.data_vencimento}
                      onChange={(e) => setNovoFin({ ...novoFin, data_vencimento: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase">Situação</label>
                  <select
                    value={novoFin.status}
                    onChange={(e) => setNovoFin({ ...novoFin, status: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white border border-[#0A0A0A]/25 text-sm"
                  >
                    <option value="pendente">A Pagar / Pendente (Gera Lembrete)</option>
                    <option value="pago">Já Pago / Recebido</option>
                  </select>
                </div>

                <button type="submit" className="w-full py-2.5 rounded-xl bg-[#0A0A0A] text-white font-bold text-sm hover:bg-[#990F0F] cursor-pointer">
                  Registrar Lançamento
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-[#FAF6F1] border border-[#0A0A0A]/20 rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-black text-base">Contas a Pagar, Pagas & Receitas</h2>

                <div className="flex flex-wrap items-center gap-2 bg-[#EFE1D1] p-2 rounded-xl border border-[#0A0A0A]/15">
                  <Calendar className="w-4 h-4 text-[#990F0F] ml-1" />
                  <input
                    type="date"
                    title="Data inicial"
                    value={filtroDataInicio}
                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-white border border-[#0A0A0A]/20 text-xs font-semibold"
                  />
                  <span className="text-xs font-bold">até</span>
                  <input
                    type="date"
                    title="Data final"
                    value={filtroDataFim}
                    onChange={(e) => setFiltroDataFim(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-white border border-[#0A0A0A]/20 text-xs font-semibold"
                  />
                  {(filtroDataInicio || filtroDataFim) && (
                    <button
                      type="button"
                      onClick={() => { setFiltroDataInicio(''); setFiltroDataFim('') }}
                      className="px-2 py-1 rounded-lg bg-[#0A0A0A] text-white text-[11px] font-bold hover:bg-[#990F0F] cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-[#0A0A0A]/15">
                  <span className="text-[#0A0A0A]/60 font-bold uppercase block">Receitas (Período)</span>
                  <span className="font-black text-sm text-emerald-700">{brl(resumoPeriodo.receitas)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#0A0A0A]/15">
                  <span className="text-[#0A0A0A]/60 font-bold uppercase block">Despesas (Período)</span>
                  <span className="font-black text-sm text-[#990F0F]">{brl(resumoPeriodo.despesas)}</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-[#0A0A0A]/15">
                  <span className="text-[#0A0A0A]/60 font-bold uppercase block">Saldo (Período)</span>
                  <span className={`font-black text-sm ${resumoPeriodo.saldo >= 0 ? 'text-[#0A0A0A]' : 'text-[#990F0F]'}`}>
                    {brl(resumoPeriodo.saldo)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {financeiroFiltrado.length === 0 ? (
                  <p className="text-sm text-[#0A0A0A]/60 text-center py-6">Nenhum lançamento encontrado neste período.</p>
                ) : (
                  financeiroFiltrado.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-xl border border-[#0A0A0A]/15">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                            item.tipo === 'receita' ? 'bg-emerald-100 text-emerald-800' : 'bg-[#990F0F]/15 text-[#990F0F]'
                          }`}>
                            {item.tipo}
                          </span>
                          <span className="font-bold text-sm">{item.descricao}</span>
                        </div>
                        <p className="text-xs text-[#0A0A0A]/60 mt-0.5">
                          Vencimento: {item.data_vencimento.split('-').reverse().join('/')}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`font-black text-sm ${item.tipo === 'receita' ? 'text-emerald-700' : 'text-[#990F0F]'}`}>
                          {item.tipo === 'receita' ? '+' : '-'} {brl(item.valor)}
                        </span>
                        <button
                          onClick={() => alternarStatusFin(item)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                            item.status === 'pago'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900 border border-amber-400'
                          }`}
                        >
                          {item.status === 'pago' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {item.status === 'pago' ? 'Pago' : 'Pendente'}
                        </button>
                        <button
                          onClick={() => setFinanceiro((prev) => prev.filter((f) => f.id !== item.id))}
                          className="text-[#0A0A0A]/40 hover:text-[#990F0F] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#FAF6F1] border-t-2 border-[#0A0A0A] grid grid-cols-4 py-1.5 z-30">
        {[
          { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
          { id: 'producao', label: 'Produção', icon: Utensils },
          { id: 'insumos', label: 'Insumos', icon: Package },
          { id: 'financeiro', label: 'Contas', icon: DollarSign },
        ].map((item) => {
          const Icon = item.icon
          const ativo = aba === item.id
          return (
            <button
              key={item.id}
              onClick={() => setAba(item.id)}
              className={`flex flex-col items-center justify-center py-1 text-[11px] font-bold ${
                ativo ? 'text-[#990F0F]' : 'text-[#0A0A0A]/70'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
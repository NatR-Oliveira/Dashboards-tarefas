import { Component, signal, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Tarefa {
  id: number;
  titulo: string;
  concluida: boolean;
  prioridade: 'baixa' | 'media' | 'alta';
  prazo?: string; 
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private platformId = inject(PLATFORM_ID);

  // Estados principais
  tarefas = signal<Tarefa[]>([]);
  novaTarefa = signal('');
  prioridadeSelecionada = signal<'baixa' | 'media' | 'alta'>('media');
  filtro = signal<'todas' | 'pendentes' | 'concluidas'>('todas');
  
  // Novos estados para Busca, Prazo e Edição
  busca = signal('');
  novoPrazo = signal('');
  tarefaEmEdicaoId = signal<number | null>(null);
  tituloEditado = signal('');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const dadosSalvos = localStorage.getItem('tarefas');
      
      if (dadosSalvos) {
        try {
          this.tarefas.set(JSON.parse(dadosSalvos));
        } catch (e) {
          console.error('Erro ao carregar tarefas salvas', e);
        }
      } else {
        this.tarefas.set([
          { id: 1, titulo: 'Configurar o ambiente Angular', concluida: true, prioridade: 'alta' },
          { id: 2, titulo: 'Testar Signals e LocalStorage', concluida: false, prioridade: 'media' }
        ]);
      }

      effect(() => {
        localStorage.setItem('tarefas', JSON.stringify(this.tarefas()));
      });
    }
  }

  totalTarefas = computed(() => this.tarefas().length);
  tarefasConcluidas = computed(() => this.tarefas().filter(t => t.concluida).length);

  // Lista atualizada que combina o Filtro de Status com o Campo de Busca
  tarefasFiltradas = computed(() => {
    const termo = this.busca().toLowerCase().trim();
    
    return this.tarefas().filter(t => {
      const atendeFiltro = 
        this.filtro() === 'todas' ? true :
        this.filtro() === 'pendentes' ? !t.concluida : t.concluida;

      const atendeBusca = t.titulo.toLowerCase().includes(termo);

      return atendeFiltro && atendeBusca;
    });
  });

  adicionarTarefa() {
    if (this.novaTarefa().trim()) {
      const nova: Tarefa = {
        id: Date.now(),
        titulo: this.novaTarefa().trim(),
        concluida: false,
        prioridade: this.prioridadeSelecionada(),
        prazo: this.novoPrazo() || undefined
      };
      this.tarefas.update(lista => [...lista, nova]);
      
      // Limpa os campos após adicionar
      this.novaTarefa.set('');
      this.novoPrazo.set('');
    }
  }

  alternarStatus(id: number) {
    this.tarefas.update(lista =>
      lista.map(t => (t.id === id ? { ...t, concluida: !t.concluida } : t))
    );
  }

  excluirTarefa(id: number) {
    this.tarefas.update(lista => lista.filter(t => t.id !== id));
  }

  definirFiltro(novoFiltro: 'todas' | 'pendentes' | 'concluidas') {
    this.filtro.set(novoFiltro);
  }

  // --- Novos Métodos ---

  isAtrasada(prazo?: string): boolean {
    if (!prazo) return false;
    const hoje = new Date().toISOString().split('T')[0];
    return prazo < hoje && !this.tarefas().find(t => t.prazo === prazo)?.concluida;
  }

  iniciarEdicao(tarefa: Tarefa) {
    this.tarefaEmEdicaoId.set(tarefa.id);
    this.tituloEditado.set(tarefa.titulo);
  }

  salvarEdicao(id: number) {
    if (this.tituloEditado().trim()) {
      this.tarefas.update(lista =>
        lista.map(t => (t.id === id ? { ...t, titulo: this.tituloEditado().trim() } : t))
      );
    }
    this.tarefaEmEdicaoId.set(null);
  }

  cancelarEdicao() {
    this.tarefaEmEdicaoId.set(null);
  }
}
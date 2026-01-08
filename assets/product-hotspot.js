import { Component } from '@theme/component';

export class ProductHotspotComponent extends Component {
  requiredRefs = ['trigger'];
  
  static instances = [];
  static activeIndex = 0;
  static prevButton = null;
  static nextButton = null;
  static totalItems = 0;

  connectedCallback() {
    super.connectedCallback();
    console.log('Hotspot connected:', this.dataset.index);
    
    // Lưu instance
    const index = parseInt(this.dataset.index || '0');
    
    // Check if this instance already exists
    const existingIndex = ProductHotspotComponent.instances.findIndex(
      inst => inst.dataset.blockId === this.dataset.blockId
    );
    
    if (existingIndex === -1) {
      ProductHotspotComponent.instances.push(this);
      ProductHotspotComponent.totalItems = ProductHotspotComponent.instances.length;
    }
    
    // Setup events
    this.setupEvents();
    
    // Initialize on first hotspot
    if (ProductHotspotComponent.instances.length === 1) {
      setTimeout(() => {
        this.initializeSlider();
      }, 100);
    }
  }

  setupEvents() {
    const { trigger } = this.refs;
    if (!trigger) return;
    
    // Click event
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleClick();
    });
    
    // Hover event (desktop only)
    if (!this.isMobile()) {
      trigger.addEventListener('mouseenter', () => {
        this.handleHover();
      });
    }
  }

  handleClick() {
    const index = parseInt(this.dataset.index || '0');
    console.log('Hotspot clicked:', index);
    ProductHotspotComponent.goToIndex(index);
  }

  handleHover() {
    if (this.isMobile()) return;
    
    const index = parseInt(this.dataset.index || '0');
    console.log('Hotspot hovered:', index);
    
    // Small delay for better UX
    clearTimeout(this.hoverTimer);
    this.hoverTimer = setTimeout(() => {
      ProductHotspotComponent.goToIndex(index);
    }, 100);
  }

  isMobile() {
    return window.innerWidth < 990;
  }

  static goToIndex(index) {
    console.log('Going to index:', index, 'Total items:', this.totalItems);
    
    if (this.totalItems === 0) return;
    
    // KHÔNG xử lý infinite loop nữa - chỉ chấp nhận index hợp lệ
    if (index < 0 || index >= this.totalItems) {
      console.log('Index out of bounds, ignoring');
      return;
    }
    
    // Update track
    const track = document.getElementById('HotspotProductTrack');
    if (track) {
      track.style.transform = `translateX(-${index * 100}%)`;
    }
    
    // Update active states
    this.updateActiveStates(index);
    
    // Update active index
    this.activeIndex = index;
    
    // Update arrows
    this.updateArrows();
  }

  static updateActiveStates(index) {
    // Update hotspots
    this.instances.forEach((hotspot, i) => {
      if (hotspot) {
        hotspot.classList.toggle('is-active', i === index);
      }
    });
    
    // Update cards
    const cards = document.querySelectorAll('.hotspot-product-card__item');
    cards.forEach((card, i) => {
      card.classList.toggle('is-active', i === index);
    });
  }

  static updateArrows() {
    if (!this.prevButton || !this.nextButton) {
      console.warn('Arrow buttons not found');
      return;
    }
    
    if (this.totalItems <= 1) {
      // Nếu chỉ có 1 item, disable cả 2 nút
      this.prevButton.disabled = true;
      this.nextButton.disabled = true;
      return;
    }
    
    // Update arrow states based on current position
    this.prevButton.disabled = this.activeIndex === 0;
    this.nextButton.disabled = this.activeIndex === this.totalItems - 1;
    
    // Update aria labels for accessibility
    if (this.prevButton.disabled) {
      this.prevButton.setAttribute('aria-label', 'No previous product');
    } else {
      this.prevButton.setAttribute('aria-label', 'Previous product');
    }
    
    if (this.nextButton.disabled) {
      this.nextButton.setAttribute('aria-label', 'No next product');
    } else {
      this.nextButton.setAttribute('aria-label', 'Next product');
    }
    
    console.log('Arrow states updated:', {
      prevDisabled: this.prevButton.disabled,
      nextDisabled: this.nextButton.disabled,
      activeIndex: this.activeIndex,
      totalItems: this.totalItems
    });
  }

  initializeSlider() {
    console.log('Initializing slider...');
    
    // Setup arrows
    const card = document.getElementById('HotspotProductCard');
    if (card) {
      // Get fresh references to buttons
      ProductHotspotComponent.prevButton = card.querySelector('.hotspot-card-arrow.prev');
      ProductHotspotComponent.nextButton = card.querySelector('.hotspot-card-arrow.next');
      
      if (ProductHotspotComponent.prevButton) {
        // Remove existing listener to avoid duplicates
        ProductHotspotComponent.prevButton.replaceWith(
          ProductHotspotComponent.prevButton.cloneNode(true)
        );
        ProductHotspotComponent.prevButton = card.querySelector('.hotspot-card-arrow.prev');
        
        ProductHotspotComponent.prevButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Prev clicked, current index:', ProductHotspotComponent.activeIndex);
          
          // Only go to previous if not at first item
          if (ProductHotspotComponent.activeIndex > 0) {
            ProductHotspotComponent.goToIndex(ProductHotspotComponent.activeIndex - 1);
          }
        });
      }
      
      if (ProductHotspotComponent.nextButton) {
        // Remove existing listener to avoid duplicates
        ProductHotspotComponent.nextButton.replaceWith(
          ProductHotspotComponent.nextButton.cloneNode(true)
        );
        ProductHotspotComponent.nextButton = card.querySelector('.hotspot-card-arrow.next');
        
        ProductHotspotComponent.nextButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Next clicked, current index:', ProductHotspotComponent.activeIndex);
          
          // Only go to next if not at last item
          if (ProductHotspotComponent.activeIndex < ProductHotspotComponent.totalItems - 1) {
            ProductHotspotComponent.goToIndex(ProductHotspotComponent.activeIndex + 1);
          }
        });
      }
    }
    
    // Set initial active state
    setTimeout(() => {
      if (ProductHotspotComponent.totalItems > 0) {
        ProductHotspotComponent.goToIndex(0);
      }
    }, 100);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.hoverTimer);
    
    // Remove from instances
    const index = ProductHotspotComponent.instances.indexOf(this);
    if (index > -1) {
      ProductHotspotComponent.instances.splice(index, 1);
      ProductHotspotComponent.totalItems = ProductHotspotComponent.instances.length;
    }
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded - looking for hotspots');
  
  // Auto-initialize existing hotspots
  const hotspots = document.querySelectorAll('product-hotspot-component');
  if (hotspots.length > 0) {
    console.log(`Found ${hotspots.length} hotspots`);
    
    // Sort by data-index
    const sortedHotspots = Array.from(hotspots).sort((a, b) => {
      return parseInt(a.dataset.index || 0) - parseInt(b.dataset.index || 0);
    });
    
    // Update instances array
    ProductHotspotComponent.instances = sortedHotspots;
    ProductHotspotComponent.totalItems = sortedHotspots.length;
    
    // Initialize slider
    if (sortedHotspots[0]) {
      sortedHotspots[0].initializeSlider();
    }
  }
});

// Handle dynamic sections (theme editor)
if (typeof Shopify !== 'undefined') {
  document.addEventListener('shopify:section:load', (event) => {
    console.log('Section loaded:', event);
    setTimeout(() => {
      const hotspots = event.target.querySelectorAll('product-hotspot-component');
      if (hotspots.length > 0) {
        // Reinitialize
        const sortedHotspots = Array.from(hotspots).sort((a, b) => {
          return parseInt(a.dataset.index || 0) - parseInt(b.dataset.index || 0);
        });
        ProductHotspotComponent.instances = sortedHotspots;
        ProductHotspotComponent.totalItems = sortedHotspots.length;
        ProductHotspotComponent.activeIndex = 0;
        
        if (sortedHotspots[0]) {
          sortedHotspots[0].initializeSlider();
        }
      }
    }, 300);
  });
}

// Register custom element
if (!customElements.get('product-hotspot-component')) {
  customElements.define('product-hotspot-component', ProductHotspotComponent);
}
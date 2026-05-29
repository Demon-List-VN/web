<script lang="ts">
	import {
		ArrowRight,
		CheckCircle2,
		Clock3,
		MessageSquareText,
		Sparkles
	} from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
</script>

<div class="level-feedback-promo" data-nosnippet>
  <div class="promo-content">
    <div class="promo-header">
      <MessageSquareText size={20} class="promo-icon" />
      <h3>{$_('homepage.level_feedback_promo.title')}</h3>
      <span class="price-badge">{$_('homepage.level_feedback_promo.price')}</span>
    </div>

    <p class="promo-desc">{$_('homepage.level_feedback_promo.description')}</p>

    <ul class="feature-list">
      <li><CheckCircle2 size={13} /> {$_('homepage.level_feedback_promo.feature_category')}</li>
      <li><Clock3 size={13} /> {$_('homepage.level_feedback_promo.feature_price')}</li>
      <li><Sparkles size={13} /> {$_('homepage.level_feedback_promo.feature_discount')}</li>
    </ul>

    <a href="/submit/level-feedback" class="promo-cta">
      {$_('homepage.level_feedback_promo.cta')}
      <ArrowRight size={15} />
    </a>
  </div>

  <div class="feedback-preview" aria-hidden="true">
    <div class="preview-header">
      <span>{$_('homepage.level_feedback_promo.preview_label')}</span>
      <b>90s</b>
    </div>
    <div class="level-strip">
      <div class="level-pulse one"></div>
      <div class="level-pulse two"></div>
      <div class="level-pulse three"></div>
    </div>
    <div class="review-lines">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <div class="corner-mark">
      <MessageSquareText size={22} />
    </div>
  </div>
</div>

<style lang="scss">
.level-feedback-promo {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 14px;
  padding: 22px 24px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 28px;
}

.promo-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.promo-header {
  display: flex;
  align-items: center;
  gap: 10px;

  h3 {
    font-size: 18px;
    font-weight: 800;
    margin: 0;
    flex: 1;
  }
}

.promo-header :global(svg) {
  color: hsl(170 72% 39%);
}

.price-badge {
  font-size: 11px;
  font-weight: 700;
  background: hsl(var(--foreground));
  color: hsl(var(--background));
  padding: 2px 8px;
  border-radius: 20px;
  white-space: nowrap;
}

.promo-desc {
  font-size: 13px;
  opacity: 0.72;
  margin: 0;
  line-height: 1.5;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    opacity: 0.72;
  }
}

.promo-cta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 700;
  color: hsl(var(--foreground));
  background: hsl(var(--muted));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  padding: 8px 16px;
  text-decoration: none;
  transition: background 0.15s ease, border-color 0.15s ease;
  align-self: flex-start;

  &:hover {
    background: hsl(var(--accent));
    border-color: hsl(170 72% 39% / 0.45);
  }
}

.feedback-preview {
  position: relative;
  border: 1px solid hsl(var(--border));
  border-radius: 10px;
  width: 280px;
  min-height: 172px;
  flex-shrink: 0;
  padding: 14px;
  overflow: hidden;
  background:
    linear-gradient(135deg, hsl(170 72% 39% / 0.16), transparent 46%),
    linear-gradient(315deg, hsl(43 88% 58% / 0.18), transparent 45%),
    hsl(var(--background));
}

.preview-header {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;

  span {
    color: hsl(var(--muted-foreground));
  }
}

.preview-header b {
  color: hsl(170 72% 34%);
}

.level-strip {
  position: relative;
  z-index: 1;
  height: 42px;
  margin: 18px 0 14px;
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
  background:
    repeating-linear-gradient(
      90deg,
      hsl(var(--muted)) 0,
      hsl(var(--muted)) 16px,
      transparent 16px,
      transparent 34px
    );
  overflow: hidden;
}

.level-pulse {
  position: absolute;
  top: 8px;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: hsl(170 72% 39% / 0.85);
  box-shadow: 0 8px 20px hsl(170 72% 39% / 0.2);

  &.one {
    left: 26px;
  }

  &.two {
    left: 108px;
    background: hsl(43 88% 58% / 0.9);
  }

  &.three {
    right: 34px;
  }
}

.review-lines {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 7px;
  margin-bottom: 16px;

  span {
    height: 7px;
    border-radius: 999px;
    background: hsl(var(--muted));

    &:nth-child(1) {
      width: 82%;
    }

    &:nth-child(2) {
      width: 68%;
    }

    &:nth-child(3) {
      width: 46%;
    }
  }
}

.corner-mark {
  position: absolute;
  right: 10px;
  bottom: 10px;
  color: hsl(170 72% 39% / 0.28);
}

@media screen and (max-width: 700px) {
  .level-feedback-promo {
    flex-direction: column;
  }

  .feedback-preview {
    width: 100%;
  }
}
</style>

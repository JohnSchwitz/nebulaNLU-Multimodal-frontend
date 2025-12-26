<script setup lang="ts">
defineProps({
  show: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['click']);
</script>

<template>
  <transition name="slide-up">
    <div v-if="show" class="survey-banner-wrap" @click="emit('click')">
      <div class="ticker-container">
        <!-- Duplicated text for seamless loop -->
        <div class="ticker-text">
          <span>🎉 You've unlocked a milestone! Help us shape the future of StoryTeller AI - Click here to share your feedback! 🎉</span>
          <span>🎉 You've unlocked a milestone! Help us shape the future of StoryTeller AI - Click here to share your feedback! 🎉</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.survey-banner-wrap {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 40px;
  background: linear-gradient(90deg, #4a6fa5, #6c5ce7);
  color: white;
  z-index: 9999; /* Above everything */
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
}

.survey-banner-wrap:hover {
  background: linear-gradient(90deg, #3b5c8d, #5a4bd1);
}

.ticker-container {
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
}

.ticker-text {
  display: inline-block;
  white-space: nowrap;
  animation: marquee 20s linear infinite;
  padding-left: 100%; /* Start off screen */
}

.ticker-text span {
  display: inline-block;
  padding-right: 50px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* Pause animation on hover so they can read it */
.survey-banner-wrap:hover .ticker-text {
  animation-play-state: paused;
}

@keyframes marquee {
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(-50%, 0, 0); }
}

/* Entry Transition */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>

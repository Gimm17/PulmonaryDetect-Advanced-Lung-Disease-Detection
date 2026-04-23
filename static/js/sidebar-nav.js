/**
 * Mobile Sidebar Navigation
 * Handles the mobile sidebar navigation functionality
 */

document.addEventListener("DOMContentLoaded", function () {
  // Elements
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const sidebarClose = document.getElementById("sidebar-close");
  const mobileSidebar = document.getElementById("mobile-sidebar");
  const sidebarOverlay = document.getElementById("sidebar-overlay");
  const sidebarLinks = document.querySelectorAll(".sidebar-nav a");

  // Open sidebar
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener("click", function () {
      openSidebar();
    });
  }

  // Close sidebar
  if (sidebarClose) {
    sidebarClose.addEventListener("click", function () {
      closeSidebar();
    });
  }

  // Close when clicking overlay
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", function () {
      closeSidebar();
    });
  }

  // Close sidebar when link is clicked
  sidebarLinks.forEach((link) => {
    link.addEventListener("click", function () {
      closeSidebar();
    });
  });

  // Close sidebar when ESC key is pressed
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeSidebar();
    }
  });

  // Handle active links in sidebar
  setActiveSidebarLink();

  // Open sidebar function
  function openSidebar() {
    if (mobileSidebar && sidebarOverlay) {
      mobileSidebar.classList.add("active");
      sidebarOverlay.classList.add("active");
      document.body.style.overflow = "hidden"; // Prevent body scrolling
    }
  }

  // Close sidebar function
  function closeSidebar() {
    if (mobileSidebar && sidebarOverlay) {
      mobileSidebar.classList.remove("active");
      sidebarOverlay.classList.remove("active");
      document.body.style.overflow = ""; // Restore body scrolling
    }
  }

  // Set active link in sidebar based on current URL
  function setActiveSidebarLink() {
    const currentPath = window.location.pathname;

    sidebarLinks.forEach((link) => {
      // Remove active class from all links
      link.classList.remove("active");

      // Get the href attribute
      const href = link.getAttribute("href");

      // Check if it's the current page
      if (
        href === currentPath ||
        (currentPath === "/" && href === "/") ||
        (href !== "/" && currentPath.includes(href))
      ) {
        link.classList.add("active");
      }
    });
  }

  // Handle window resize
  window.addEventListener("resize", function () {
    if (window.innerWidth > 768) {
      closeSidebar();
    }
  });
});

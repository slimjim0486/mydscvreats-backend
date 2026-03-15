import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import { getRestaurantTheme, type RestaurantTheme } from "@/lib/restaurant-theme";
import { generateQrDataUrl } from "@/lib/qr-code";

// ── Types ──────────────────────────────────────────────────

interface DietaryTagInfo {
  label: string;
}

interface PdfMenuItem {
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  isAvailable: boolean;
  dietaryTags: DietaryTagInfo[];
}

interface PdfMenuSection {
  name: string;
  items: PdfMenuItem[];
}

export interface PdfRestaurantData {
  name: string;
  slug: string;
  cuisineType: string | null;
  location: string | null;
  themeKey: string | null;
  logoUrl: string | null;
  whatsappNumber: string | null;
  sections: PdfMenuSection[];
}

export type PdfTemplate = "table-card" | "full-menu";

interface PdfOptions {
  restaurant: PdfRestaurantData;
  template: PdfTemplate;
  hideBranding: boolean;
}

// ── Fonts ──────────────────────────────────────────────────

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuDyYAZ9hjQ.ttf",
      fontWeight: 700,
    },
  ],
});

// ── Helpers ────────────────────────────────────────────────

function formatPrice(price: number | null, currency: string): string {
  if (price == null) return "";
  return `${currency} ${price.toFixed(2)}`;
}

function truncate(text: string | null, maxLength: number): string {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength - 1) + "\u2026" : text;
}

function tagLabels(tags: DietaryTagInfo[]): string {
  if (tags.length === 0) return "";
  return tags.map((t) => t.label).join(" \u00B7 ");
}

// ── Table Card Template (A5 Landscape) ─────────────────────

function TableCardTemplate({
  restaurant,
  theme,
  restaurantQr,
  whatsappQr,
  hideBranding,
}: {
  restaurant: PdfRestaurantData;
  theme: RestaurantTheme;
  restaurantQr: string;
  whatsappQr: string | null;
  hideBranding: boolean;
}) {
  const s = StyleSheet.create({
    page: {
      width: "210mm",
      height: "148mm",
      fontFamily: "Inter",
      backgroundColor: "#FFFFFF",
      padding: 0,
    },
    header: {
      backgroundColor: theme.heroFrom,
      paddingHorizontal: 24,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
    },
    logo: {
      width: 36,
      height: 36,
      borderRadius: 6,
      marginRight: 12,
    },
    headerText: {
      flex: 1,
    },
    restaurantName: {
      fontSize: 16,
      fontWeight: 700,
      color: "#FFFFFF",
    },
    cuisine: {
      fontSize: 8,
      color: "rgba(255,255,255,0.7)",
      marginTop: 2,
    },
    body: {
      flex: 1,
      flexDirection: "row",
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 6,
    },
    columnLeft: {
      flex: 1,
      marginRight: 10,
    },
    columnRight: {
      flex: 1,
      marginLeft: 10,
    },
    sectionName: {
      fontSize: 9,
      fontWeight: 700,
      color: theme.accent,
      marginBottom: 4,
      paddingBottom: 2,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    itemRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 2,
    },
    itemName: {
      fontSize: 8,
      fontWeight: 600,
      color: "#1A1A1A",
      flex: 1,
    },
    itemPrice: {
      fontSize: 8,
      fontWeight: 600,
      color: theme.price,
      marginLeft: 8,
    },
    itemDesc: {
      fontSize: 6.5,
      color: "#666666",
      marginBottom: 1,
    },
    itemTags: {
      fontSize: 5.5,
      color: theme.accent,
      marginBottom: 3,
    },
    footer: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    qrBlock: {
      alignItems: "center",
      flex: 1,
    },
    qrImage: {
      width: 70,
      height: 70,
    },
    qrLabel: {
      fontSize: 6,
      color: "#888888",
      marginTop: 2,
      textAlign: "center",
    },
    whatsappQrBlock: {
      alignItems: "center",
      marginLeft: 16,
    },
    whatsappQr: {
      width: 48,
      height: 48,
    },
    whatsappLabel: {
      fontSize: 5,
      color: "#AAAAAA",
      marginTop: 1,
      textAlign: "center",
    },
    branding: {
      fontSize: 5.5,
      color: "#AAAAAA",
      textAlign: "center",
      marginTop: 3,
    },
  });

  // Split sections into two columns
  const allSections = restaurant.sections.filter((sec) => sec.items.length > 0);
  const totalItems = allSections.reduce((n, sec) => n + sec.items.length, 0);
  let leftCount = 0;
  let splitIdx = allSections.length;
  for (let i = 0; i < allSections.length; i++) {
    leftCount += allSections[i].items.length;
    if (leftCount >= Math.ceil(totalItems / 2)) {
      splitIdx = i + 1;
      break;
    }
  }
  const leftSections = allSections.slice(0, splitIdx);
  const rightSections = allSections.slice(splitIdx);

  const renderSection = (section: PdfMenuSection, sectionIdx: number) =>
    React.createElement(
      View,
      { key: `s-${sectionIdx}`, style: { marginBottom: 6 } },
      React.createElement(Text, { style: s.sectionName }, section.name),
      ...section.items
        .filter((item) => item.isAvailable)
        .slice(0, 12) // limit items per section for card
        .map((item, itemIdx) =>
          React.createElement(
            View,
            { key: `i-${sectionIdx}-${itemIdx}` },
            React.createElement(
              View,
              { style: s.itemRow },
              React.createElement(Text, { style: s.itemName }, item.name),
              item.price != null
                ? React.createElement(
                    Text,
                    { style: s.itemPrice },
                    formatPrice(item.price, item.currency)
                  )
                : null
            ),
            item.description
              ? React.createElement(
                  Text,
                  { style: s.itemDesc },
                  truncate(item.description, 80)
                )
              : null,
            item.dietaryTags.length > 0
              ? React.createElement(
                  Text,
                  { style: s.itemTags },
                  tagLabels(item.dietaryTags)
                )
              : null
          )
        )
    );

  return React.createElement(
    Page,
    { size: [595.28, 419.53], style: s.page },
    // Header
    React.createElement(
      View,
      { style: s.header },
      restaurant.logoUrl
        ? React.createElement(Image, {
            src: restaurant.logoUrl,
            style: s.logo,
          })
        : null,
      React.createElement(
        View,
        { style: s.headerText },
        React.createElement(Text, { style: s.restaurantName }, restaurant.name),
        restaurant.cuisineType
          ? React.createElement(Text, { style: s.cuisine }, restaurant.cuisineType)
          : null
      )
    ),
    // Body
    React.createElement(
      View,
      { style: s.body },
      React.createElement(
        View,
        { style: s.columnLeft },
        ...leftSections.map(renderSection)
      ),
      React.createElement(
        View,
        { style: s.columnRight },
        ...rightSections.map((sec, i) => renderSection(sec, leftSections.length + i))
      )
    ),
    // Footer — QR codes side by side using flexbox
    React.createElement(
      View,
      { style: s.footer },
      React.createElement(
        View,
        { style: s.qrBlock },
        React.createElement(Image, { src: restaurantQr, style: s.qrImage }),
        React.createElement(Text, { style: s.qrLabel }, "Scan to view full menu"),
        !hideBranding
          ? React.createElement(
              Text,
              { style: s.branding },
              "Powered by mydscvr Eats"
            )
          : null
      ),
      whatsappQr
        ? React.createElement(
            View,
            { style: s.whatsappQrBlock },
            React.createElement(Image, { src: whatsappQr, style: s.whatsappQr }),
            React.createElement(Text, { style: s.whatsappLabel }, "WhatsApp")
          )
        : null
    )
  );
}

// ── Full Menu Template (A4 Portrait) ──────────────────────

function FullMenuTemplate({
  restaurant,
  theme,
  restaurantQr,
  whatsappQr,
  hideBranding,
}: {
  restaurant: PdfRestaurantData;
  theme: RestaurantTheme;
  restaurantQr: string;
  whatsappQr: string | null;
  hideBranding: boolean;
}) {
  const s = StyleSheet.create({
    page: {
      fontFamily: "Inter",
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 32,
      paddingTop: 28,
      paddingBottom: 50,
    },
    // Cover page
    coverPage: {
      fontFamily: "Inter",
      backgroundColor: "#FFFFFF",
      padding: 0,
    },
    coverHeader: {
      backgroundColor: theme.heroFrom,
      height: "45%",
      justifyContent: "center",
      alignItems: "center",
      padding: 40,
    },
    coverLogo: {
      width: 64,
      height: 64,
      borderRadius: 12,
      marginBottom: 16,
    },
    coverName: {
      fontSize: 28,
      fontWeight: 700,
      color: "#FFFFFF",
      textAlign: "center",
    },
    coverCuisine: {
      fontSize: 12,
      color: "rgba(255,255,255,0.7)",
      marginTop: 6,
      textAlign: "center",
    },
    coverLocation: {
      fontSize: 10,
      color: "rgba(255,255,255,0.6)",
      marginTop: 4,
      textAlign: "center",
    },
    coverQrSection: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    coverQr: {
      width: 100,
      height: 100,
    },
    coverQrLabel: {
      fontSize: 9,
      color: "#888888",
      marginTop: 6,
      textAlign: "center",
    },
    // Menu pages
    sectionTitle: {
      fontSize: 14,
      fontWeight: 700,
      color: theme.accent,
      marginTop: 16,
      marginBottom: 6,
      paddingBottom: 4,
      borderBottomWidth: 1.5,
      borderBottomColor: theme.divider,
    },
    itemContainer: {
      marginBottom: 6,
      paddingBottom: 4,
      borderBottomWidth: 0.5,
      borderBottomColor: "#EEEEEE",
    },
    itemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
    },
    itemName: {
      fontSize: 10,
      fontWeight: 600,
      color: "#1A1A1A",
      flex: 1,
    },
    itemPrice: {
      fontSize: 10,
      fontWeight: 600,
      color: theme.price,
      marginLeft: 12,
    },
    itemDesc: {
      fontSize: 8,
      color: "#666666",
      marginTop: 2,
      lineHeight: 1.3,
    },
    itemTags: {
      fontSize: 7,
      color: theme.accent,
      marginTop: 2,
    },
    // Footer
    pageFooter: {
      position: "absolute",
      bottom: 16,
      left: 32,
      right: 32,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    pageNumber: {
      fontSize: 7,
      color: "#AAAAAA",
      textAlign: "center",
    },
    footerWhatsapp: {
      position: "absolute",
      right: 0,
      bottom: 0,
      alignItems: "center",
    },
    footerWhatsappQr: {
      width: 40,
      height: 40,
    },
    footerWhatsappLabel: {
      fontSize: 5,
      color: "#AAAAAA",
      marginTop: 1,
    },
    // Last page
    lastFooter: {
      alignItems: "center",
      marginTop: 30,
    },
    lastQr: {
      width: 90,
      height: 90,
    },
    lastQrLabel: {
      fontSize: 8,
      color: "#888888",
      marginTop: 4,
    },
    branding: {
      fontSize: 6,
      color: "#AAAAAA",
      marginTop: 6,
    },
  });

  const sections = restaurant.sections.filter((sec) => sec.items.length > 0);

  // Cover page
  const coverPage = React.createElement(
    Page,
    { size: "A4", style: s.coverPage },
    React.createElement(
      View,
      { style: s.coverHeader },
      restaurant.logoUrl
        ? React.createElement(Image, {
            src: restaurant.logoUrl,
            style: s.coverLogo,
          })
        : null,
      React.createElement(Text, { style: s.coverName }, restaurant.name),
      restaurant.cuisineType
        ? React.createElement(Text, { style: s.coverCuisine }, restaurant.cuisineType)
        : null,
      restaurant.location
        ? React.createElement(Text, { style: s.coverLocation }, restaurant.location)
        : null
    ),
    React.createElement(
      View,
      { style: s.coverQrSection },
      React.createElement(Image, { src: restaurantQr, style: s.coverQr }),
      React.createElement(
        Text,
        { style: s.coverQrLabel },
        `mydscvr.ai/${restaurant.slug}`
      )
    )
  );

  // Menu content pages — sections can wrap across pages, individual items don't split
  const menuPages = React.createElement(
    Page,
    { size: "A4", style: s.page, wrap: true },
    ...sections.map((section, sectionIdx) =>
      React.createElement(
        View,
        { key: `s-${sectionIdx}` },
        // Section title tries to stay with at least the first item (minPresenceAhead)
        React.createElement(
          Text,
          { style: s.sectionTitle, minPresenceAhead: 40 },
          section.name
        ),
        ...section.items
          .filter((item) => item.isAvailable)
          .map((item, itemIdx) =>
            React.createElement(
              View,
              { key: `i-${sectionIdx}-${itemIdx}`, style: s.itemContainer, wrap: false },
              React.createElement(
                View,
                { style: s.itemHeader },
                React.createElement(Text, { style: s.itemName }, item.name),
                item.price != null
                  ? React.createElement(
                      Text,
                      { style: s.itemPrice },
                      formatPrice(item.price, item.currency)
                    )
                  : null
              ),
              item.description
                ? React.createElement(Text, { style: s.itemDesc }, item.description)
                : null,
              item.dietaryTags.length > 0
                ? React.createElement(
                    Text,
                    { style: s.itemTags },
                    tagLabels(item.dietaryTags)
                  )
                : null
            )
          )
      )
    ),
    // Last page footer with QR
    React.createElement(
      View,
      { style: s.lastFooter, wrap: false },
      React.createElement(Image, { src: restaurantQr, style: s.lastQr }),
      React.createElement(
        Text,
        { style: s.lastQrLabel },
        "Scan to view the full digital menu"
      ),
      !hideBranding
        ? React.createElement(Text, { style: s.branding }, "Powered by mydscvr Eats")
        : null
    ),
    // Page footer with page number + optional whatsapp QR
    React.createElement(
      View,
      { style: s.pageFooter, fixed: true },
      React.createElement(
        Text,
        { style: s.pageNumber, render: ({ pageNumber }: { pageNumber: number }) => `${pageNumber}` }
      ),
      whatsappQr
        ? React.createElement(
            View,
            { style: s.footerWhatsapp },
            React.createElement(Image, { src: whatsappQr, style: s.footerWhatsappQr }),
            React.createElement(Text, { style: s.footerWhatsappLabel }, "WhatsApp")
          )
        : null
    )
  );

  return React.createElement(React.Fragment, null, coverPage, menuPages);
}

// ── Main Export Function ───────────────────────────────────

export async function generateMenuPdf(options: PdfOptions): Promise<Buffer> {
  const { restaurant, template, hideBranding } = options;
  const theme = getRestaurantTheme(restaurant.themeKey);

  // Generate QR codes
  const restaurantQr = await generateQrDataUrl(
    `https://mydscvr.ai/${restaurant.slug}`,
    200
  );

  const whatsappQr = restaurant.whatsappNumber
    ? await generateQrDataUrl(
        `https://wa.me/${restaurant.whatsappNumber.replace(/[^0-9]/g, "")}`,
        150
      )
    : null;

  const templateProps = { restaurant, theme, restaurantQr, whatsappQr, hideBranding };

  const doc = React.createElement(
    Document,
    { title: `${restaurant.name} Menu`, author: "mydscvr Eats" },
    template === "table-card"
      ? React.createElement(TableCardTemplate, templateProps)
      : React.createElement(FullMenuTemplate, templateProps)
  );

  return renderToBuffer(doc);
}

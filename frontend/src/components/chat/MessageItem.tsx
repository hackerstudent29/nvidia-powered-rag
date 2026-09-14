import React, { useState, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message, SourceItem } from "../../types/chat";
import ThinkingState from "./ThinkingState";
import SourceChip, { getDomainFromUrl } from "./SourceChip";
import FeedbackModal from "./FeedbackModal";
import ResourceCards from "./ResourceCards";
import TokenCostBadge, { TokenCostPanel } from "./TokenCostBadge";
import { audioManager } from "../../utils/audioManager";
import { Tooltip } from "../Tooltip";

const API_BASE = "/api";



interface MessageItemProps {
  message: Message;
  userQuery?: string;
  sessionId: string;
  isLatestMessage?: boolean;
  onSendPrompt?: (prompt: string) => void;
  onRegenerate?: (targetMessageId?: string) => void;
  onRegenerateWithNeMo?: (queryText: string, targetMessageId?: string) => void;
  onSubmitFeedback?: (data: {
    message_id: string;
    session_id: string;
    query_text: string;
    response_text: string;
    rating: number;
    category: string;
    user_comment: string;
  }) => Promise<void>;
}

const ACTION_ICONS = {
  copy: (
    <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  retry: (
    <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  ),
  up: (
    <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  ),
  down: (
    <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V1H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-14h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
    </svg>
  ),
  tts: (
    <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
};

function formatAudioTime(sec: number): string {
  if (!sec || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function sanitizeMarkdownContent(content: string): string {
  if (!content) return "";
  let text = content;

  // 0. Strip any raw document/section metadata headers leaked from context chunks or fallback headers
  text = text.replace(/Here is the verified information from official MSAJCEA campus records:\s*/gi, "");
  text = text.replace(/^(?:#{1,4}\s*)?Document:.*$/gim, "");
  text = text.replace(/^(?:#{1,4}\s*)?Section:.*$/gim, "");
  text = text.replace(/^(?:#{1,4}\s*)?Version:.*$/gim, "");

  // 1. Remove code backticks wrapping markdown links e.g. `[text](url)` -> [text](url)
  text = text.replace(/`(\[[^\]]+\]\([^\)]+\))`?/g, "$1");

  // 2. Remove emojis and extraneous symbols inside link text and href parenthesis
  text = text.replace(/\[\s*(?:✉️|📧|✉|📞|📱)?\s*([^\]]+?)\s*\]\(\s*(mailto|tel|https?):\s*(?:✉️|📧|✉|📞|📱)?\s*([^\)\s]+)\s*\)/gi,
    (_match, linkText, proto, linkUrl) => {
      const cleanText = linkText.replace(/^(?:✉️|📧|✉|📞|📱)\s*/, "").trim();
      const cleanUrl = linkUrl.replace(/[^a-zA-Z0-9\+\.\/@_:-]/g, "").trim();
      return `[${cleanText}](${proto}:${cleanUrl})`;
    }
  );

  // 3. Fix double nested markdown link corruption
  text = text.replace(/\[\s*([^\]]+?)\s*\]\((?:mailto|tel|https?):\[[^\]]+\]\((?:mailto|tel|https?):([^\)]+)\)\)/gi, "[$1]($2)");
  text = text.replace(/\[\s*\[([^\]]+)\]\([^\)]+\)\s*\]\(([^\)]+)\)/g, "[$1]($2)");

  // 4. Remove duplicate emojis right before [link]
  text = text.replace(/(?:✉️|📧|✉|📞|📱)\s*(\[[^\]]+\]\((?:mailto|tel):[^\)]+\))/g, "$1");

  // 5. MOBILE & DESKTOP STRUCTURAL FORMATTING: Line-wise key-value formatting only when multiple items are smashed inline
  const lines = text.split("\n");
  const processedLines: string[] = [];

  for (let line of lines) {
    const stripped = line.trim();

    // Skip table rows, code blocks, or horizontal divider lines
    if (stripped.startsWith("|") || stripped.startsWith("```") || /^[\-\*\=_]{3,}$/.test(stripped)) {
      processedLines.push(line);
      continue;
    }

    // A. Break consecutive inline bold key-value pairs ONLY if multiple exist on the exact same line
    const kvCount = (line.match(/\*\*[A-Za-z0-9\s\/\&\-\(\)\.]{2,35}:\*\*/g) || []).length;
    if (kvCount > 1) {
      line = line.replace(/([^\n])\s*(\*\*[A-Za-z0-9\s\/\&\-\(\)\.]{2,35}:\*\*)\s*/g, "$1\n- $2 ");
    }

    // B. Break consecutive inline feature headers ONLY if multiple exist on the same line
    const featCount = (line.match(/[🎓💰🏫📝✨🔥📌⚡💡•]\s*\*\*/g) || []).length;
    if (featCount > 1) {
      line = line.replace(/([^\n])\s*(([🎓💰🏫📝✨🔥📌⚡💡•]\s*)?\*\*[A-Za-z0-9\s\/\&\-\(\)\.]{2,35}\*\*\s*[\—\-–])\s*/g, "$1\n- $2 ");
    }

    processedLines.push(line);
  }

  text = processedLines.join("\n");

  // Clean up any accidental double bullets like "- - **" or "- - 🎓"
  text = text.replace(/-\s*-\s*(?=\*\*|[🎓💰🏫📝✨🔥📌⚡💡•])/g, "- ");

  return text;
}

function formatBulletPointForSpeech(bulletText: string): string {
  let text = bulletText.trim();
  if (!text) return "";

  const expMatch = text.match(/^([A-Za-z0-9\s\-\&\/]+?)\s*\(([\d\+\-\–\s]+?)\s*(?:years?|yrs?)\)\s*:\s*(.+)$/i);
  if (expMatch) {
    const role = expMatch[1].trim();
    let expRange = expMatch[2].trim().replace(/[\–\-]/g, " to ").replace(/\+/g, " plus");
    let amount = expMatch[3].trim().replace(/[\–\-]/g, " to ");
    amount = amount.replace(/\bLPA\b/gi, "Lakhs per annum");
    if (!/[.!?]$/.test(amount)) amount += ".";
    return `${role} with ${expRange} years of experience get ${amount}`;
  }

  const kvMatch = text.match(/^([A-Za-z0-9\s\-\&\/]+?)\s*:\s*(.+)$/);
  if (kvMatch) {
    const key = kvMatch[1].trim();
    let val = kvMatch[2].trim().replace(/[\–\-]/g, " to ");
    val = val.replace(/\bLPA\b/gi, "Lakhs per annum");

    const isSalaryOrAmount = /lakhs|per annum|lpa|rs|rupees|\d+\s*-\s*\d+|\d+\s*to\s*\d+/i.test(val);
    if (isSalaryOrAmount) {
      if (!/[.!?]$/.test(val)) val += ".";
      return `${key} get ${val}`;
    }
  }

  text = text.replace(/(\d+)\s*[\–\-]\s*(\d+)/g, "$1 to $2");
  text = text.replace(/(\d+)\+/g, "$1 plus");
  text = text.replace(/\bLPA\b/gi, "Lakhs per annum");
  if (!/[.!?]$/.test(text)) text += ".";
  return text;
}

function prepareCleanTTSText(markdown: string): string {
  if (!markdown) return "";
  let text = markdown;

  // 1. Remove code blocks & HTML tags
  text = text.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/<[^>]+>/g, "");

  // 2. Remove URLs
  text = text.replace(/https?:\/\/[^\s\)]+/gi, "");
  text = text.replace(/mailto:[^\s\)]+/gi, "");
  text = text.replace(/tel:[^\s\)]+/gi, "");

  // 3. Transform markdown links [text](url) -> text
  text = text.replace(/\[\s*([^\]]+?)\s*\]\(\s*([^\)]+?)\s*\)/g, "$1");

  // 4. Clean email addresses for natural reading: user@domain.ext -> user at domain dot ext
  text = text.replace(
    /\b([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})\b/g,
    (_, user, domain, ext) => {
      const cleanDomain = domain.replace(/-/g, " ").replace(/\./g, " dot ");
      return `${user} at ${cleanDomain} dot ${ext}`;
    }
  );

  // 5. Format phone numbers before digit ranges (e.g. 044-27470025 -> 044, 27470025)
  text = text.replace(/\b(\+?\d{2,4})[\s\-]+(\d{3,5})[\s\-]+(\d{3,5})\b/g, "$1, $2, $3");
  text = text.replace(/\b(\+?\d{2,4})[\s\-]+(\d{6,8})\b/g, "$1, $2");

  // 6. Comprehensive Clock Times, Ranges & Durations Enunciation
  const TIME_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const TIME_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

  const numToWords = (n: number): string => {
    if (n >= 0 && n < 20) return TIME_ONES[n];
    if (n >= 20 && n < 100) {
      const t = Math.floor(n / 10);
      const u = n % 10;
      return u > 0 ? `${TIME_TENS[t]} ${TIME_ONES[u]}` : TIME_TENS[t];
    }
    return String(n);
  };

  const minToWords = (m: number): string => {
    if (m === 0) return "";
    if (m < 10) return `oh ${TIME_ONES[m]}`;
    return numToWords(m);
  };

  const hourToWords = (h: number): string => {
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return TIME_ONES[h12];
  };

  // Duration ranges: 10-15 minutes, 1-2 hours
  text = text.replace(/\b(\d{1,2})\s*[-–—]\s*(\d{1,2})\s*(minutes?|mins?|hours?|hrs?|seconds?|secs?)\b/gi, (_, n1, n2, unit) => {
    const u = unit.toLowerCase().startsWith("min") ? "minutes" : unit.toLowerCase().startsWith("hr") || unit.toLowerCase().startsWith("hour") ? "hours" : "seconds";
    return `${numToWords(parseInt(n1, 10))} to ${numToWords(parseInt(n2, 10))} ${u}`;
  });

  // Time range separators: 8:00 - 8:30 or 8:00 AM - 9:30 AM
  text = text.replace(/(\b\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm)?)\s*[-–—]\s*(\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm)?\b)/g, "$1 to $2");
  text = text.replace(/(\b\d{1,2}\s*(?:AM|PM|am|pm))\s*[-–—]\s*(\d{1,2}[:.]\d{2}\s*(?:AM|PM|am|pm)?\b)/g, "$1 to $2");

  // Clock times with AM/PM (e.g. 8:00 AM, 8.00am, 3:12 PM, 12:45 pm)
  text = text.replace(/\b(\d{1,2})[:.](\d{2})\s*(AM|PM|am|pm)\b/gi, (_, hStr, mStr, ampmStr) => {
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const ampm = ampmStr.toUpperCase();
    const hSpoken = hourToWords(h);
    if (m === 0) return `${hSpoken} ${ampm}`;
    return `${hSpoken} ${minToWords(m)} ${ampm}`;
  });

  // Standalone hours with AM/PM (e.g. 8 AM, 8am, 9 PM)
  text = text.replace(/\b(\d{1,2})\s*(AM|PM|am|pm)\b/gi, (_, hStr, ampmStr) => {
    const h = parseInt(hStr, 10);
    return `${hourToWords(h)} ${ampmStr.toUpperCase()}`;
  });

  // Plain clock times HH:MM without AM/PM (e.g. 8:00, 3:12, 14:30)
  text = text.replace(/(?<!\d\.)\b([01]?\d|2[0-3]):([0-5]\d)\b(?!\.\d)/g, (_, hStr, mStr) => {
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (h > 23 || m > 59) return `${hStr}:${mStr}`;
    if (h >= 13) {
      const h12 = h - 12;
      return m === 0 ? `${TIME_ONES[h12]} o'clock PM` : `${TIME_ONES[h12]} ${minToWords(m)} PM`;
    } else if (h === 12) {
      return m === 0 ? "twelve o'clock" : `twelve ${minToWords(m)}`;
    } else if (h === 0) {
      return m === 0 ? "twelve midnight" : `twelve ${minToWords(m)} AM`;
    } else {
      return m === 0 ? `${TIME_ONES[h]} o'clock` : `${TIME_ONES[h]} ${minToWords(m)}`;
    }
  });

  // Plain dot time in context: "at 8.30", "by 9.00"
  text = text.replace(/\b(at|by|from|until|till|around|before|after)\s+([01]?\d|2[0-3])\.([0-5]\d)\b/gi, (_, prefix, hStr, mStr) => {
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const timeSpoken = m === 0 ? `${TIME_ONES[h % 12 || 12]} o'clock` : `${TIME_ONES[h % 12 || 12]} ${minToWords(m)}`;
    return `${prefix} ${timeSpoken}`;
  });

  // 7. Clean, fast, natural location and institutional pronunciations (NO multi-hyphens)
  const phoneticReplacements: [RegExp, string][] = [
    // Campus & Institutional names
    [/\bMSAJCEA\b/gi, "Mohamed Sathak College"],
    [/\bMSAJCE\b/gi, "Mohamed Sathak College"],
    [/\bMohamed Sathak\b/gi, "Mohamed Sathak"],
    [/\bSIPCOT\b/gi, "Sipcot"],
    [/\bOMR\b/gi, "OMR"],
    [/\bECR\b/gi, "ECR"],
    [/\bNAAC\b/gi, "NAAC"],
    [/\bAICTE\b/gi, "AICTE"],
    [/\bTNEA\b/gi, "TNEA"],
    [/\bNBA\b/gi, "NBA"],
    [/\bNIRF\b/gi, "NIRF"],
    [/\bIQAC\b/gi, "IQAC"],
    [/\bIEEE\b/gi, "IEEE"],
    [/\bISTE\b/gi, "ISTE"],
    [/\bNPTEL\b/gi, "NPTEL"],

    // Academic Departments & Degrees
    [/\bAI&DS\b/gi, "AI and Data Science"],
    [/\bAIDS\b/gi, "AI and Data Science"],
    [/\bAIML\b|\bAI\/ML\b/gi, "AI and Machine Learning"],
    [/\bCSE\b/gi, "Computer Science"],
    [/\bECE\b/gi, "Electronics and Communication"],
    [/\bEEE\b/gi, "Electrical and Electronics"],
    [/\bIT\b/gi, "Information Technology"],
    [/\bMECH\b/gi, "Mechanical"],
    [/\bCIVIL\b/gi, "Civil"],
    [/\bB\.Tech\b|\bBTech\b/gi, "B Tech"],
    [/\bM\.Tech\b|\bMTech\b/gi, "M Tech"],
    [/\bB\.E\b|\bBE\b/gi, "B E"],
    [/\bM\.E\b|\bME\b/gi, "M E"],
    [/\bM\.B\.A\b|\bMBA\b/gi, "MBA"],
    [/\bPh\.D\b|\bPhD\b/gi, "PhD"],
    [/\bUG\b/gi, "undergraduate"],
    [/\bPG\b/gi, "postgraduate"],
    [/\bCGPA\b/gi, "CGPA"],
    [/\bGPA\b/gi, "GPA"],
    [/\bLPA\b|\blpa\b/gi, "Lakhs per annum"],

    // Chennai / OMR / Campus Bus Stop Locations (Smooth, unhyphenated, natural fast pronunciation)
    [/\bSholinganallur\b/gi, "Sholingnallur"],
    [/\bKilambakkam\b/gi, "Keelambakkam"],
    [/\bSemmancheri\b/gi, "Semmancheri"],
    [/\bSiruseri\b/gi, "Siruseri"],
    [/\bNavalur\b/gi, "Navalur"],
    [/\bEgattur\b/gi, "Egattur"],
    [/\bKelambakkam\b/gi, "Kelambakkam"],
    [/\bThiruvanmiyur\b/gi, "Thiruvanmiyur"],
    [/\bThoraipakkam\b/gi, "Thoraipakkam"],
    [/\bKarapakkam\b/gi, "Karapakkam"],
    [/\bMedavakkam\b/gi, "Medavakkam"],
    [/\bMadipakkam\b/gi, "Madipakkam"],
    [/\bPerungudi\b/gi, "Perungudi"],
    [/\bKandanchavadi\b/gi, "Kandanchavadi"],
    [/\bKoyambedu\b/gi, "Koyambedu"],
    [/\bTambaram\b/gi, "Tambaram"],
    [/\bVelachery\b/gi, "Velachery"],
    [/\bGuindy\b/gi, "Guindy"],
    [/\bAdyar\b/gi, "Adyar"],
    [/\bChrompet\b|\bChromepet\b/gi, "Chromepet"],
    [/\bPallavaram\b/gi, "Pallavaram"],
    [/\bPerumbakkam\b/gi, "Perumbakkam"],
    [/\bPallikaranai\b/gi, "Pallikaranai"],
    [/\bGuduvanchery\b/gi, "Guduvanchery"],
    [/\bVandalur\b/gi, "Vandalur"],
    [/\bPadur\b/gi, "Padur"],
    [/\bMaraimalai Nagar\b/gi, "Maraimalai Nagar"],
    [/\bThalambur\b/gi, "Thalambur"],
    [/\bVaniyanchavadi\b/gi, "Vaniyanchavadi"],
    [/\bKazhipattur\b/gi, "Kazhipattur"],
    [/\bThiruporur\b/gi, "Thiruporur"],
    [/\bThirukazhukundram\b/gi, "Thirukazhukundram"],
    [/\bNeelankarai\b/gi, "Neelankarai"],
    [/\bKilkattalai\b|\bKeelkattalai\b/gi, "Keelkattalai"],
    [/\bMeenambakkam\b/gi, "Meenambakkam"],
    [/\bEkkattuthangal\b/gi, "Ekkattuthangal"],
    [/\bKathipara\b/gi, "Kathipara"],
    [/\bRoyapettah\b/gi, "Royapettah"],
    [/\bMylapore\b/gi, "Mylapore"],
    [/\bMandaveli\b/gi, "Mandaveli"],
    [/\bTriplicane\b/gi, "Triplicane"],
    [/\bPerambur\b/gi, "Perambur"],
    [/\bMoolakadai\b/gi, "Moolakadai"],
    [/\bPeriyamet\b/gi, "Periyamet"],
    [/\bTeynampet\b/gi, "Teynampet"],
    [/\bKotturpuram\b/gi, "Kotturpuram"],
    [/\bNesapakkam\b/gi, "Nesapakkam"],
    [/\bThirumangalam\b/gi, "Thirumangalam"],
    [/\bPorur\b/gi, "Porur"],
    [/\bPoonamallee\b/gi, "Poonamallee"],
    [/\bValasaravakkam\b/gi, "Valasaravakkam"],
    [/\bRamapuram\b/gi, "Ramapuram"],
    [/\bKundrathur\b/gi, "Kundrathur"],
    [/\bSelaiyur\b/gi, "Selaiyur"],
    [/\bPerungalathur\b/gi, "Perungalathur"],
    [/\bUrapakkam\b/gi, "Urapakkam"],
    [/\bUthiramerur\b/gi, "Uthiramerur"],
    [/\bParanur\b/gi, "Paranur"],
    [/\bChunambedu\b/gi, "Chunambedu"],
    [/\bKadapakkam\b/gi, "Kadapakkam"],
    [/\bKalpakkam\b/gi, "Kalpakkam"],
    [/\bPaiyanur\b/gi, "Paiyanur"],
    [/\bManjambakkam\b/gi, "Manjambakkam"],
    [/\bRetteri\b/gi, "Retteri"],
    [/\bAdambakkam\b|\bAadampakkam\b/gi, "Adambakkam"],
    [/\bEnnore\b/gi, "Ennore"],
    [/\bPammal\b/gi, "Pammal"],
    [/\bKovoor\b/gi, "Kovoor"],
    [/\bNemilichery\b/gi, "Nemilichery"],
    [/\bPadi\b/gi, "Padi"],
    [/\bChoolaimedu\b/gi, "Choolaimedu"],
    [/\bOtteri\b/gi, "Otteri"],
    [/\bChinthamani\b/gi, "Chinthamani"],
    [/\bArumbakkam\b/gi, "Arumbakkam"],
    [/\bNungambakkam\b/gi, "Nungambakkam"],
    [/\bKodambakkam\b/gi, "Kodambakkam"],
    [/\bSaidapet\b/gi, "Saidapet"],
    [/\bVadapalani\b/gi, "Vadapalani"],
    [/\bAshok Nagar\b/gi, "Ashok Nagar"],
    [/\bKattupakkam\b/gi, "Kattupakkam"],
    [/\bKumananchavadi\b/gi, "Kumananchavadi"],
    [/\bAnakaputhur\b/gi, "Anakaputhur"],
    [/\bKandigai\b/gi, "Kandigai"],
    [/\bMambakkam\b/gi, "Mambakkam"],
    [/\bPuthupakkam\b/gi, "Puthupakkam"],
    [/\bThaiyur\b/gi, "Thaiyur"],
    [/\bKalavakkam\b/gi, "Kalavakkam"],
    [/\bAlathur\b/gi, "Alathur"],
    [/\bPalavakkam\b/gi, "Palavakkam"],
    [/\bAkkarai\b/gi, "Akkarai"],
    [/\bEchankadu\b/gi, "Echankadu"],

    // People & Recruiters
    [/\bSrinivasan\b/gi, "Srinivasan"],
    [/\bSanthosh Nathan\b/gi, "Santhosh Nathan"],
    [/\bAbdul Gafoor\b/gi, "Abdul Gafoor"],
    [/\bVamsi Naga Mohan\b/gi, "Vamsi Naga Mohan"],
    [/\bSethuraman\b/gi, "Sethuraman"],
    [/\bRamanathan\b/gi, "Ramanathan"],
    [/\bWeslin\b/gi, "Weslin"],
    [/\bJaffar\b/gi, "Jaffar"],
    [/\bRavindran\b/gi, "Ravindran"],
    [/\bInfosys\b/gi, "Infosys"],
    [/\bCognizant\b/gi, "Cognizant"],
    [/\bCapgemini\b/gi, "Capgemini"],
    [/\bAccenture\b/gi, "Accenture"],
    [/\bMindtree\b/gi, "Mindtree"],
    [/\bHexaware\b/gi, "Hexaware"],
    [/\bVirtusa\b/gi, "Virtusa"],
    [/\bZoho\b/gi, "Zoho"],
    [/\bHyundai\b/gi, "Hyundai"]
  ];
  for (const [pattern, repl] of phoneticReplacements) {
    text = text.replace(pattern, repl);
  }

  // 7. Line by line Markdown parsing
  const lines = text.split("\n");
  const processedLines: string[] = [];
  let tableHeaders: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) {
      tableHeaders = [];
      continue;
    }

    if (/^\|?[\s\-:|]+\|?$/.test(line)) {
      continue;
    }

    if (line.includes("|")) {
      const cells = line
        .split("|")
        .map((c) => c.trim().replace(/[*_`]/g, ""))
        .filter((c) => c.length > 0);

      if (cells.length >= 2) {
        if (tableHeaders.length === 0) {
          // First row of a table is the column header row — remember headers, do not read as data
          tableHeaders = cells;
          continue;
        }

        const primary = cells[0];
        const details = cells.slice(1).map((val, idx) => {
          const header = tableHeaders[idx + 1] ? `${tableHeaders[idx + 1]}: ` : "";
          return `${header}${val}`;
        }).join(", ");

        processedLines.push(`${primary} — ${details}.`);
        continue;
      } else if (cells.length === 1) {
        processedLines.push(`${cells[0]}.`);
        continue;
      }
    } else {
      tableHeaders = [];
    }

    // Remove heading markers (### )
    if (/^#{1,6}\s+/.test(line)) {
      line = line.replace(/^#{1,6}\s+/, "");
    }

    // Remove list markers
    line = line.replace(/^(\d+\.|\*|\-|\+|•|▪|►|▶|◆|★|✓|✔|✕|✖)\s+/, "");

    let cleanLine = line.replace(/[*_`]/g, "").trim();
    cleanLine = cleanLine.replace(/(\d{4})\s*[\–\-]\s*(\d{4})/g, "$1 to $2");
    cleanLine = cleanLine.replace(/(\d+)\+/g, "$1 plus");
    cleanLine = cleanLine.replace(/\bLPA\b/gi, "Lakhs per annum");
    if (cleanLine) {
      processedLines.push(cleanLine);
    }
  }

  text = processedLines.join(" ");

  // 8. Replace slashes & ampersands to prevent speaking "forward slash"
  text = text.replace(/\band\/or\b/gi, "or");
  text = text.replace(/\b([A-Za-z0-9.]+)\s*\/\s*([A-Za-z0-9.]+)\b/g, "$1 or $2");
  text = text.replace(/[/\\_]/g, " ");
  text = text.replace(/\s*&\s*/g, " and ");

  // 9. Replace em-dashes, en-dashes, double-dashes, isolated hyphens, colons with natural pause commas
  text = text.replace(/\s*[\—\–]\s*/g, ", ");
  text = text.replace(/\s+--\s+/g, ", ");
  text = text.replace(/\s+-\s+/g, ", ");
  text = text.replace(/:\s+/g, ", ");

  // 10. Thoroughly remove all emojis & unicode symbols without stripping English text
  text = text.replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}]/gu, "");

  // 11. Remove remaining non-speech punctuation/symbols
  text = text.replace(/[#*`~[\](){}<>|]/g, "");

  // 12. Deduplicate repeated conjunction words like "and and and" or "or or"
  text = text.replace(/\b(and|or|the|in|of|to)([,\s]+\1\b)+/gi, "$1");

  // 13. Fix double punctuation & clean extra spaces
  text = text.replace(/,\s*,/g, ",");
  text = text.replace(/\.\s*\./g, ".");
  text = text.replace(/,\s*\./g, ".");
  text = text.replace(/\s+/g, " ").trim();

  if (text && !/[.!?]$/.test(text)) text += ".";
  return text;
}

function countWordSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!clean) return 1;

  // Pure digits: count digits as spoken words (e.g. "1301" -> 5 spoken syllables)
  if (/^\d+$/.test(clean)) {
    return Math.max(1, Math.round(clean.length * 1.3));
  }

  // Acronyms (e.g. "MSAJCEA", "TNEA", "AI&DS") -> 1 syllable per capital letter
  if (/^[A-Z0-9]{2,}$/.test(word.replace(/[^A-Za-z0-9]/g, ""))) {
    return Math.max(1, word.replace(/[^A-Za-z0-9]/g, "").length);
  }

  // Vowel group counting for English words
  const vowels = clean.match(/[aeiouy]{1,2}/g);
  let count = vowels ? vowels.length : 1;
  if (clean.endsWith("e") && !clean.endsWith("le") && count > 1) {
    count--;
  }

  return Math.max(1, count);
}

function computeTTSWordStartTimes(ttsWords: string[], duration: number): number[] {
  if (ttsWords.length === 0 || duration <= 0) return [];
  const weights = ttsWords.map((w) => {
    const syllables = countWordSyllables(w);
    let weight = syllables * 2.0;

    // Pause weights for speech prosody & Deepgram Flux phrasing
    if (/[,\-;:]/.test(w)) weight += 2.8;  // Clause break pause (~300ms)
    if (/[.!?]/.test(w)) weight += 5.2;    // Sentence end pause (~600ms)

    return weight;
  });

  const totalWeight = weights.reduce((sum, val) => sum + val, 0);
  let accumulated = 0;
  return ttsWords.map((_, i) => {
    const start = (accumulated / totalWeight) * duration;
    accumulated += weights[i];
    return start;
  });
}

function isWordToken(token: string): boolean {
  if (!token || /^\s+$/.test(token)) return false;
  return /[a-zA-Z0-9]/.test(token);
}

function extractDisplayWords(markdown: string): string[] {
  if (!markdown) return [];
  let text = markdown;
  text = text.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/\[\s*([^\]]+?)\s*\]\(\s*([^\)]+?)\s*\)/g, "$1");
  const rawTokens = text.split(/\s+/);
  return rawTokens.map((w) => w.trim()).filter((w) => isWordToken(w));
}

function buildTTSToDisplayMapping(displayWords: string[], ttsWords: string[]): number[] {
  if (ttsWords.length === 0) return [];
  if (displayWords.length === 0) return ttsWords.map((_, i) => i);

  const map: number[] = new Array(ttsWords.length).fill(0);
  let dIdx = 0;

  for (let tIdx = 0; tIdx < ttsWords.length; tIdx++) {
    const rawT = ttsWords[tIdx];
    const tClean = rawT.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (!tClean) {
      map[tIdx] = Math.min(dIdx, displayWords.length - 1);
      continue;
    }

    let matched = false;
    // Search within a forward window of up to 6 display words
    for (let lookahead = 0; lookahead <= 6 && dIdx + lookahead < displayWords.length; lookahead++) {
      const targetDIdx = dIdx + lookahead;
      const dRaw = displayWords[targetDIdx];
      const dClean = dRaw.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!dClean) continue;

      // 1. Exact token match
      if (tClean === dClean) {
        dIdx = targetDIdx;
        map[tIdx] = dIdx;
        matched = true;
        break;
      }

      // 2. Acronym or Number expansion match (e.g. spoken token "m", "s", "a" matching display token "msajcea")
      if (dClean.length > tClean.length && dClean.includes(tClean) && (dClean.startsWith(tClean) || tClean.length >= 2)) {
        dIdx = targetDIdx;
        map[tIdx] = dIdx;
        matched = true;
        break;
      }

      // 3. Prefix match for words >= 3 characters
      if (tClean.length >= 3 && dClean.length >= 3 && (dClean.startsWith(tClean) || tClean.startsWith(dClean))) {
        dIdx = targetDIdx;
        map[tIdx] = dIdx;
        matched = true;
        break;
      }
    }

    if (!matched) {
      map[tIdx] = Math.min(dIdx, displayWords.length - 1);
    }
  }

  return map;
}

function extractRawTextFromNode(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractRawTextFromNode).join("");
  if (React.isValidElement(node)) {
    return extractRawTextFromNode((node.props as any)?.children);
  }
  return "";
}

function autoLinkPhoneNumbers(content: string): string {
  if (!content) return "";
  let text = content;
  // Match Indian landlines (+91 44 2747 4222, 044-27474222, 044 2747 4222), mobiles (+91 9789970304), toll free
  return text.replace(
    /(?<!\[[^\]]*)(?<!href=["'])(?<!tel:)(\+91[\s\-]?(?:\d{2,4})[\s\-]?\d{3,4}[\s\-]?\d{3,4}|\b0\d{2,4}[\s\-]?\d{6,8}\b|\b[6-9]\d{9}\b)/g,
    (match) => {
      const cleanNum = match.replace(/[^\d+]/g, "");
      const formattedNum = cleanNum.startsWith("+")
        ? cleanNum
        : cleanNum.startsWith("0")
        ? `+91${cleanNum.slice(1)}`
        : `+91${cleanNum}`;
      return `[${match}](tel:${formattedNum})`;
    }
  );
}

function formatTimestampWithSeconds(ts?: string | Date): string {
  if (!ts) return "";
  try {
    const date = typeof ts === "string" ? new Date(ts) : ts;
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

const MessageItem = React.memo(function MessageItem({
  message,
  userQuery,
  sessionId,
  isLatestMessage = true,
  onSendPrompt,
  onRegenerate,
  onRegenerateWithNeMo,
  onSubmitFeedback,
}: MessageItemProps) {
  const isUser = message.role === "user";
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [activeWordIdx, setActiveWordIdx] = useState<number>(-1);
  const [ttsSpeed, setTtsSpeed] = useState<number>(() => {
    const saved = localStorage.getItem("lorin_tts_speed");
    return saved ? parseFloat(saved) : 1.15;
  });
  const [ttsExpressivity, setTtsExpressivity] = useState<number>(() => {
    const saved = localStorage.getItem("lorin_tts_expressivity");
    return saved !== null ? parseInt(saved, 10) : 2;
  });
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const messageRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const wordCounterRef = useRef<number>(0);
  const ttsToDisplayMapRef = useRef<number[]>([]);

  const timeStr = formatTimestampWithSeconds(message.timestamp);

  const currentTTSWordIdxRef = useRef<number>(0);
  const activeVoiceRef = useRef<string>(localStorage.getItem("lorin_tts_voice") || "flux-brooke-en");

  // Sync voice settings live across all message toolbars & Voice Controls modal
  useEffect(() => {
    const syncVoiceSettings = () => {
      const savedSpeed = localStorage.getItem("lorin_tts_speed");
      const savedVoice = localStorage.getItem("lorin_tts_voice") || "flux-brooke-en";
      const savedExpr = localStorage.getItem("lorin_tts_expressivity");

      if (savedSpeed) {
        const newSpeed = parseFloat(savedSpeed);
        setTtsSpeed(newSpeed);
        if (audioRef.current && isPlayingAudio) {
          audioRef.current.playbackRate = newSpeed;
        }
      }

      const newExpr = savedExpr !== null ? parseInt(savedExpr, 10) : 2;
      const exprChanged = newExpr !== ttsExpressivity;
      const voiceChanged = savedVoice !== activeVoiceRef.current;

      if (exprChanged) {
        setTtsExpressivity(newExpr);
      }

      if (isPlayingAudio && (voiceChanged || exprChanged)) {
        activeVoiceRef.current = savedVoice;
        const resumeFromIdx = currentTTSWordIdxRef.current;
        handleTTS(savedVoice, resumeFromIdx);
      } else {
        activeVoiceRef.current = savedVoice;
      }
    };

    window.addEventListener("lorin_voice_settings_changed", syncVoiceSettings);
    return () => window.removeEventListener("lorin_voice_settings_changed", syncVoiceSettings);
  }, [isPlayingAudio, ttsSpeed, ttsExpressivity]);



  // Global click-outside listener: close sources & stats dropdowns when clicking outside or on empty space
  useEffect(() => {
    if (!sourcesOpen && !statsOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (messageRef.current && !messageRef.current.contains(e.target as Node)) {
        setSourcesOpen(false);
        setStatsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [sourcesOpen, statsOpen]);

  const cycleTtsSpeed = () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];
    const currentIdx = speeds.indexOf(ttsSpeed);
    const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % speeds.length : 2;
    const newSpeed = speeds[nextIdx];
    setTtsSpeed(newSpeed);
    if (audioRef.current && isPlayingAudio) {
      audioRef.current.playbackRate = newSpeed;
    }
    localStorage.setItem("lorin_tts_speed", newSpeed.toString());
    window.dispatchEvent(new CustomEvent("lorin_voice_settings_changed"));
  };

  const cycleTtsExpressivity = () => {
    const tones = [-2, -1, 0, 1, 2];
    const currentIdx = tones.indexOf(ttsExpressivity);
    const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % tones.length : 2;
    const newTone = tones[nextIdx];
    setTtsExpressivity(newTone);
    localStorage.setItem("lorin_tts_expressivity", newTone.toString());
    window.dispatchEvent(new CustomEvent("lorin_voice_settings_changed"));
  };

  const stopAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      } catch (e) {
        // ignore
      }
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
    }
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlayingAudio(false);
    setIsLoadingAudio(false);
    setActiveWordIdx(-1);
    currentTTSWordIdxRef.current = 0;
    audioManager.unregister(message.id);
  };

  // Cleanup audio on component unmount and listen to global stop event
  useEffect(() => {
    const handleGlobalStop = () => stopAudio();
    window.addEventListener("stop-all-audio", handleGlobalStop);
    
    return () => {
      stopAudio();
      window.removeEventListener("stop-all-audio", handleGlobalStop);
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const playWebSpeechFallback = (spokenText: string, words: string[]) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !audioManager.isPlaying(message.id)) {
      stopAudio();
      return;
    }

    // Force cancel existing speech
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      } catch (e) {}
      audioRef.current = null;
    }

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = ttsSpeed;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";

    const availableVoices = window.speechSynthesis.getVoices();
    const fixedVoice = availableVoices.find(v => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Zira") || v.name.includes("Samantha"))) || availableVoices.find(v => v.lang.startsWith("en"));
    if (fixedVoice) {
      utterance.voice = fixedVoice;
    }

    utterance.onboundary = (e) => {
      if (e.name === "word") {
        const textBefore = spokenText.substring(0, e.charIndex);
        const ttsWIdx = textBefore.trim().split(/\s+/).filter(Boolean).length;
        const mappedDisplayIdx = ttsToDisplayMapRef.current[ttsWIdx] ?? ttsWIdx;
        setActiveWordIdx(mappedDisplayIdx);
      }
    };
    utterance.onend = () => {
      stopAudio();
    };
    utterance.onerror = () => {
      stopAudio();
    };
    utterance.onstart = () => {
      setIsPlayingAudio(true);
      setIsLoadingAudio(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleTTS = async (overrideVoice?: string, startWordOffset: number = 0) => {
    // If currently playing or loading, clicking stops audio immediately
    if ((isPlayingAudio || isLoadingAudio) && overrideVoice === undefined && startWordOffset === 0) {
      stopAudio();
      return;
    }

    const isMidSpeechSwitch = startWordOffset > 0 && isPlayingAudio;

    // 1. Immediately kill all running audio globally to enforce strict single-voice playback
    window.dispatchEvent(new CustomEvent("stop-all-audio"));
    audioManager.stopAll();
    audioManager.registerAudio(message.id, stopAudio);

    if (isMidSpeechSwitch) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    }

    const cleanText = prepareCleanTTSText(message.content);
    if (!cleanText) return;

    const displayWords = extractDisplayWords(message.content);
    const ttsWords = cleanText.split(/\s+/).filter(Boolean);
    ttsToDisplayMapRef.current = buildTTSToDisplayMapping(displayWords, ttsWords);

    if (startWordOffset >= ttsWords.length - 1) {
      stopAudio();
      return;
    }

    const segmentTTSWords = startWordOffset > 0 ? ttsWords.slice(startWordOffset) : ttsWords;
    const textToSynthesize = segmentTTSWords.join(" ");
    if (!textToSynthesize) return;

    setIsLoadingAudio(true);

    try {
      // Use Deepgram Flux HD Neural Voice Agent TTS API
      const rawVoice = overrideVoice || localStorage.getItem("lorin_tts_voice") || "flux-brooke-en";
      const validVoices = [
        "flux-brooke-en", "flux-cliff-en", "flux-maeve-en", "flux-alexis-en",
        "flux-hannah-en", "flux-gemma-en", "flux-meena-en", "flux-priya-en",
        "flux-sharon-en", "flux-bruce-en", "flux-colin-en", "flux-naveen-en",
        "flux-kit-en", "flux-miles-en", "flux-kai-en"
      ];
      const selectedVoice = validVoices.includes(rawVoice) ? rawVoice : "flux-brooke-en";

      const res = await fetch(`${API_BASE}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSynthesize,
          voice: selectedVoice,
          speed: ttsSpeed,
          rate: ttsSpeed,
          expressivity: ttsExpressivity
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`TTS API Error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      if (!data.audio_base64) throw new Error("No audio payload returned from TTS service");

      // Verify this message is STILL the active message selected by the user before playing
      if (!audioManager.isPlaying(message.id)) {
        setIsLoadingAudio(false);
        return;
      }

      const spokenText = data.spoken_text || cleanText;
      const spokenWords = spokenText.split(/\s+/).filter(Boolean);

      // Create a fresh HTML5 Audio element instance
      const audio = new Audio(data.audio_base64);
      audioRef.current = audio;
      audioManager.setAudioElement(audio);

      let wordStartTimes: number[] = [];

      const updateHighlightLoop = () => {
        if (audioRef.current && !audioRef.current.paused) {
          const duration = audioRef.current.duration;
          if (duration && duration > 0 && spokenWords.length > 0) {
            if (wordStartTimes.length === 0) {
              wordStartTimes = computeTTSWordStartTimes(spokenWords, duration);
            }

            const currTime = audioRef.current.currentTime;
            let segmentWordIdx = 0;
            for (let i = 0; i < wordStartTimes.length; i++) {
              if (currTime >= wordStartTimes[i]) {
                segmentWordIdx = i;
              } else {
                break;
              }
            }

            const currentTTSWordIdx = startWordOffset + segmentWordIdx;
            currentTTSWordIdxRef.current = currentTTSWordIdx;
            const activeDisplayIdx = ttsToDisplayMapRef.current[currentTTSWordIdx] ?? currentTTSWordIdx;
            setActiveWordIdx(activeDisplayIdx);
          }
          animFrameRef.current = requestAnimationFrame(updateHighlightLoop);
        }
      };

      audio.onplay = () => {
        // Strict single-voice guarantee: cancel WebSpeech immediately if active
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
        setIsPlayingAudio(true);
        setIsLoadingAudio(false);
        if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = requestAnimationFrame(updateHighlightLoop);
      };

      audio.onended = () => {
        stopAudio();
      };

      audio.onerror = (e) => {
        console.error("[Deepgram Audio Playback Error]", e);
        stopAudio();
      };

      audio.playbackRate = 1.0;
      await audio.play();

      setIsLoadingAudio(false);
      setIsPlayingAudio(true);
    } catch (err) {
      console.warn("[Deepgram TTS failed, falling back to WebSpeech safely]", err);
      setIsLoadingAudio(false);

      // Explicitly tear down any audio element before WebSpeech starts
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.removeAttribute("src");
          audioRef.current.load();
        } catch (e) {}
        audioRef.current = null;
        audioManager.setAudioElement(null);
      }

      playWebSpeechFallback(cleanText, displayWords);
    }
  };

  const handleThumbs = async (rating: number) => {
    setFeedbackRating(rating);
    const query = userQuery || "MSAJCEA Campus Inquiry";
    if (rating > 0) {
      setIsLiked(true);
      setIsDisliked(false);
      setToastMsg("✓ Positive feedback recorded into Neon DB!");
      setTimeout(() => setToastMsg(null), 2500);
      if (onSubmitFeedback) {
        await onSubmitFeedback({
          message_id: message.id,
          session_id: sessionId,
          query_text: query,
          response_text: message.content,
          rating: 1,
          category: "accurate",
          user_comment: "User liked response",
        });
      }
    } else {
      setIsDisliked(true);
      setIsLiked(false);
      setIsFeedbackOpen(true);
    }
  };

  const handleFeedbackSubmit = async (reason: string, customFeedback?: string) => {
    setIsFeedbackOpen(false);
    setToastMsg("Feedback submitted into Neon DB!");
    setTimeout(() => setToastMsg(null), 2500);

    const query = userQuery || "MSAJCEA Campus Inquiry";
    if (onSubmitFeedback) {
      await onSubmitFeedback({
        message_id: message.id,
        session_id: sessionId,
        query_text: query,
        response_text: message.content,
        rating: -1,
        category: reason,
        user_comment: customFeedback || reason,
      });
    }
  };

  if (isUser) {
    return (
      <div className="flex flex-col items-end mt-7 mb-4 sm:mt-8 sm:mb-5 w-full max-w-full min-w-0 box-border overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
        {/* User Profile Header (You + Timestamp + Avatar) aligned to top right */}
        <div className="flex items-center gap-2 mb-1.5 shrink-0 justify-end pr-1">
          <span className="text-[11.5px] font-bold text-ink-2 dark:text-zinc-300">You</span>
          {timeStr && <span className="text-[10px] font-mono text-ink-3/70">• {timeStr}</span>}
          <div className="size-7 rounded-full bg-gradient-to-br from-[#D0CCE5] to-[#F2CFDF] dark:from-[#4C1D95]/50 dark:to-[#9D174D]/50 border border-white/80 dark:border-white/20 shadow-xs flex items-center justify-center text-[#4C1D95] dark:text-[#c4b5fd] shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>
        {/* User Chat Bubble placed directly BELOW the profile */}
        <div className="max-w-2xl min-w-0 box-border">
          <div className="bg-[#2E6B5E]/10 dark:bg-[#10b981]/15 text-ink dark:text-[#f4f3ee] px-4 py-2.5 rounded-2xl rounded-tr-xs border border-[#2E6B5E]/20 dark:border-[#10b981]/30 font-sans text-sm font-medium leading-relaxed break-words shadow-sm overflow-hidden min-w-0">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  const sources = useMemo(() => {
    const raw = message.sources || [];
    const seen = new Set<string>();
    return raw.filter((s) => {
      const key = (s.source_file || s.title || "").toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [message.sources]);

  const sanitizedMarkdown = useMemo(() => {
    return autoLinkPhoneNumbers(sanitizeMarkdownContent(message.content));
  }, [message.content]);

  // Reset document word counter before every render pass
  wordCounterRef.current = 0;

  const processHighlightedChildren = (node: React.ReactNode): React.ReactNode => node;

  return (
    <div ref={messageRef} className="flex flex-col mt-3 mb-7 sm:mt-4 sm:mb-9 w-full max-w-full min-w-0 box-border overflow-hidden animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <div className="size-6 rounded-full overflow-hidden border border-black/10 dark:border-white/20 shadow-sm shrink-0 bg-black flex items-center justify-center ring-1 ring-accent/20">
          <img src="/lorin-pic.png" alt="Lorin AI" className="w-full h-full object-cover" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-ink">Lorin AI</span>
          <span className="rounded-full bg-[#E1EED7] dark:bg-[#2E6B5E]/50 px-1.5 py-0.2 text-[9px] font-semibold text-[#2E6B5E] dark:text-[#E1EED7]">
            MSAJCEA
          </span>
          {message.model && (
            <span className="text-[10px] text-ink-3 hidden sm:inline-block">
              • {message.model.replace("zai/", "").replace("google/", "").replace("minimax/", "")}
            </span>
          )}
        </div>
      </div>

      {/* AI message body — symmetric pl-0 sm:pl-7 and pr-2 sm:pr-10 right alignment buffer */}
      <div className="w-full max-w-full min-w-0 box-border text-ink pl-0 sm:pl-7 pr-2 sm:pr-10 overflow-hidden">
        <ThinkingState
          variant="Steps"
          isLiveStreaming={message.is_streaming}
          liveSteps={message.reasoning_steps}
          durationSeconds={message.latency_ms ? message.latency_ms / 1000 : undefined}
        />

        <div className="prose-clean w-full max-w-full min-w-0 box-border leading-relaxed text-ink mt-1 break-words overflow-x-auto overflow-y-hidden">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2.5 text-xs sm:text-sm text-ink/90 font-normal leading-relaxed">{processHighlightedChildren(children)}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 sm:pl-5 mb-3 space-y-1 text-xs sm:text-sm text-ink/90">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 sm:pl-5 mb-3 space-y-1 text-xs sm:text-sm text-ink/90">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{processHighlightedChildren(children)}</li>,
              h1: ({ children }) => <h1 className="font-heading font-bold tracking-tight text-base sm:text-lg mt-4 mb-2 text-ink flex items-center gap-2">{processHighlightedChildren(children)}</h1>,
              h2: ({ children }) => <h2 className="font-heading font-bold tracking-tight text-sm sm:text-base mt-3.5 mb-2 pb-1 border-b border-line/40 dark:border-white/[0.06] text-ink flex items-center gap-2">{processHighlightedChildren(children)}</h2>,
              h3: ({ children }) => <h3 className="font-heading font-bold text-xs sm:text-sm mt-3 mb-1.5 text-ink">{processHighlightedChildren(children)}</h3>,
              h4: ({ children }) => <h4 className="font-heading font-semibold text-xs sm:text-xs mt-2.5 mb-1 text-ink-2">{processHighlightedChildren(children)}</h4>,
              hr: () => <hr className="my-3.5 border-line/50 dark:border-white/[0.06]" />,
              blockquote: ({ children }) => <blockquote className="font-heading border-l-3 sm:border-l-4 border-[#2E6B5E] dark:border-[#10b981] bg-[#2E6B5E]/5 dark:bg-[#10b981]/10 rounded-r-xl p-2.5 sm:p-3.5 my-3 text-xs sm:text-sm text-ink-2 italic shadow-hairline">{processHighlightedChildren(children)}</blockquote>,
              strong: ({ children }) => <strong className="font-bold text-ink">{processHighlightedChildren(children)}</strong>,
              em: ({ children }) => <em className="italic">{processHighlightedChildren(children)}</em>,
              table: ({ children }) => (
                <div className="group relative w-full max-w-full min-w-0 overflow-x-auto custom-scrollbar my-3 rounded-xl sm:rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 p-1.5 box-border backdrop-blur-sm transition-all duration-200">
                  <table className="w-full min-w-[300px] border-collapse text-left text-xs sm:text-sm border-none table-auto">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-gradient-to-r from-[#2E6B5E]/15 via-[#2E6B5E]/8 to-transparent dark:from-[#10b981]/20 dark:via-[#10b981]/10 dark:to-transparent text-[#2E6B5E] dark:text-[#10b981] font-heading border-none">{children}</thead>
              ),
              tbody: ({ children }) => (
                <tbody className="text-ink font-medium border-none">{children}</tbody>
              ),
              tr: ({ children }) => (
                <tr className="hover:bg-[#2E6B5E]/5 dark:hover:bg-[#10b981]/10 transition-colors duration-150 border-none border-b border-black/[0.04] dark:border-white/[0.04] last:border-none">{children}</tr>
              ),
              th: ({ children }) => (
                <th className="px-3 py-2.5 uppercase tracking-wider font-extrabold text-[10px] sm:text-xs text-[#2E6B5E] dark:text-[#34D399] border-none align-top first:whitespace-nowrap first:min-w-[105px] sm:first:min-w-[130px] whitespace-normal break-words">
                  {processHighlightedChildren(children)}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-2.5 text-ink align-top leading-relaxed text-xs sm:text-sm border-none first:whitespace-nowrap first:font-bold first:text-ink first:min-w-[105px] sm:first:min-w-[130px] whitespace-normal break-words">
                  {processHighlightedChildren(children)}
                </td>
              ),
              a: ({ href, children }) => {
                const rawHref = (href || "").trim();
                const childrenText = extractRawTextFromNode(children).trim();

                const createLongPressCopy = (textToCopy: string, typeName: string) => {
                  let timer: any = null;
                  let isLongPress = false;

                  return {
                    onTouchStart: () => {
                      isLongPress = false;
                      timer = setTimeout(() => {
                        isLongPress = true;
                        if (textToCopy) {
                          navigator.clipboard?.writeText(textToCopy);
                          setToastMsg(`✓ Copied ${typeName} (${textToCopy}) to clipboard!`);
                          setTimeout(() => setToastMsg(null), 2500);
                        }
                      }, 420);
                    },
                    onTouchEnd: () => {
                      if (timer) clearTimeout(timer);
                    },
                    onMouseDown: () => {
                      isLongPress = false;
                      timer = setTimeout(() => {
                        isLongPress = true;
                        if (textToCopy) {
                          navigator.clipboard?.writeText(textToCopy);
                          setToastMsg(`✓ Copied ${typeName} (${textToCopy}) to clipboard!`);
                          setTimeout(() => setToastMsg(null), 2500);
                        }
                      }, 420);
                    },
                    onMouseUp: () => {
                      if (timer) clearTimeout(timer);
                    },
                    onContextMenu: (e: React.MouseEvent) => {
                      if (textToCopy) {
                        navigator.clipboard?.writeText(textToCopy);
                        setToastMsg(`✓ Copied ${typeName} (${textToCopy}) to clipboard!`);
                        setTimeout(() => setToastMsg(null), 2500);
                      }
                    },
                    onClick: (e: React.MouseEvent) => {
                      if (isLongPress) {
                        e.preventDefault();
                        e.stopPropagation();
                        isLongPress = false;
                      }
                    }
                  };
                };

                const phoneRegex = /(\+91[\s\-]?(?:\d{2,4})[\s\-]?\d{3,4}[\s\-]?\d{3,4}|\b0\d{2,4}[\s\-]?\d{6,8}\b|\b[6-9]\d{9}\b)/;
                const phoneFromText = childrenText.match(phoneRegex);
                const phoneFromHref = rawHref.match(phoneRegex);
                const detectedPhone = (phoneFromText ? phoneFromText[0] : null) || (phoneFromHref ? phoneFromHref[0] : null);

                const isTelScheme = rawHref.startsWith("tel:");
                const isRawPhone = /^\+?\d[\d\s\-]{6,15}$/.test(rawHref) || /^\+91/.test(rawHref);
                const isPhoneLink = isTelScheme || isRawPhone || !!detectedPhone;

                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
                const emailFromText = childrenText.match(emailRegex);
                const emailFromHref = rawHref.match(emailRegex);
                const detectedEmail = (emailFromText ? emailFromText[0] : null) || (emailFromHref ? emailFromHref[0] : null);

                const isMailtoScheme = rawHref.startsWith("mailto:");
                const isEmail = isMailtoScheme || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(rawHref) || !!detectedEmail;

                if (isPhoneLink) {
                  const targetPhone = detectedPhone || childrenText || rawHref.replace(/^tel:/, "");
                  const cleanDigits = targetPhone.replace(/[^\d+]/g, "");
                  const cleanTel = `tel:${cleanDigits.startsWith("+") ? cleanDigits : cleanDigits.startsWith("0") ? `+91${cleanDigits.slice(1)}` : `+91${cleanDigits}`}`;
                  const phoneCopyText = detectedPhone || childrenText || cleanDigits;
                  const handlers = createLongPressCopy(phoneCopyText, "Phone Number");

                  return (
                    <a
                      href={cleanTel}
                      {...handlers}
                      className="relative z-10 cursor-pointer font-semibold text-emerald-700 dark:text-emerald-400 underline underline-offset-2 hover:opacity-80 transition-opacity inline-flex items-center gap-1 select-text"
                      title="Tap to call on default phone app | Long press to copy"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline shrink-0 text-emerald-600 dark:text-emerald-400">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      {processHighlightedChildren(children)}
                    </a>
                  );
                }

                if (isEmail) {
                  const targetEmail = detectedEmail || childrenText || rawHref.replace(/^mailto:/, "");
                  const cleanMail = `mailto:${targetEmail.trim()}`;
                  const handlers = createLongPressCopy(targetEmail, "Email Address");

                  return (
                    <a
                      href={cleanMail}
                      {...handlers}
                      className="relative z-10 cursor-pointer font-semibold text-[#2E6B5E] dark:text-[#34D399] underline underline-offset-2 hover:opacity-80 transition-opacity inline-flex items-center gap-1 select-text"
                      title="Tap to open Email client | Long press to copy"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline shrink-0">
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                      {processHighlightedChildren(children)}
                    </a>
                  );
                }

                const targetUrl = rawHref.startsWith("http") ? rawHref : `https://${rawHref}`;
                const linkCopyValue = (targetUrl !== "https://" && targetUrl !== "https://") ? targetUrl : childrenText;
                const handlers = createLongPressCopy(linkCopyValue, "Link URL");

                return (
                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    {...handlers}
                    className="relative z-10 cursor-pointer font-semibold text-accent underline underline-offset-2 hover:opacity-80 transition-opacity inline-flex items-center gap-0.5 select-text"
                    title="Tap to open link | Long press to copy"
                  >
                    {processHighlightedChildren(children)}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline ml-0.5">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                );
              },
              img: ({ src, alt }) => (
                <div className="my-3 overflow-hidden rounded-xl border border-line shadow-sm max-w-lg">
                  <img src={src} alt={alt || "MSAJCEA Media"} className="w-full h-auto object-cover max-h-72" loading="lazy" />
                  {alt && <div className="bg-surface px-3 py-1.5 text-[11px] text-ink-2 font-medium border-t border-line/40">{alt}</div>}
                </div>
              ),
              code: ({ className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || "");
                const lang = match ? match[1] : "";
                if (lang === "map-location" || lang === "map-route") {
                  const isRoute = lang === "map-route";
                  return (
                    <div className="my-3.5 w-full max-w-xl rounded-2xl border border-line bg-surface/90 p-3.5 shadow-hairline dark:bg-surface/95 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="size-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                          📍
                        </div>
                        <div>
                          <h4 className="text-[13.5px] font-bold text-ink">
                            {isRoute ? "Directions to MSAJCEA Campus" : "MSAJCEA Campus Location & Map"}
                          </h4>
                          <p className="text-[11px] text-ink-3">Mohamed Sathak A.J. College of Engineering, Egattur, OMR, Chennai</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 mt-3">
                        <a
                          href="https://maps.google.com/?q=Mohamed+Sathak+A.J.+College+of+Engineering+Chennai"
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#2E6B5E] text-white dark:bg-[#10b981] dark:text-zinc-950 font-bold text-xs shadow-sm hover:opacity-90 transition-opacity"
                        >
                          Google Maps Navigation ↗
                        </a>
                      </div>
                    </div>
                  );
                }
                return (
                  <code className="rounded bg-surface-2 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-[12.5px] text-accent" {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {sanitizedMarkdown}
          </ReactMarkdown>

          {message.is_streaming && (
            <span
              className="ml-1 inline-block h-3.5 w-1 translate-y-0.5 rounded-full bg-accent animate-pulse"
            />
          )}
        </div>

        {/* Verified Download & Media Attachments */}
        {!message.is_streaming && message.resource_attachments && message.resource_attachments.length > 0 && (
          <ResourceCards attachments={message.resource_attachments} />
        )}

        {/* Restructured Bottom Toolbar for AI Messages */}
        {!message.is_streaming && (
          <div className="mt-2 flex flex-col gap-2 pt-2 border-t border-line/30 dark:border-white/[0.04]">
            {/* Row 1: Action Buttons (Left) & Answer Completion Timestamp (Pushed to Right End) */}
            <div className="flex items-center justify-between gap-2 w-full min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <Tooltip content={copied ? "Copied!" : "Copy message"} position="top">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center justify-center size-7 rounded-[6px] text-ink-3 transition-colors duration-100 hover:bg-hover-2 hover:text-ink-2 cursor-pointer"
                  >
                    {copied ? <span className="text-[10px] font-bold text-green">✓</span> : ACTION_ICONS.copy}
                  </button>
                </Tooltip>

                {onRegenerate && (
                  <Tooltip content="Regenerate response" position="top">
                    <button
                      type="button"
                      onClick={() => onRegenerate?.(message.id)}
                      className="flex items-center justify-center size-7 rounded-[6px] text-ink-3 transition-colors duration-100 hover:bg-hover-2 hover:text-ink-2 cursor-pointer"
                    >
                      {ACTION_ICONS.retry}
                    </button>
                  </Tooltip>
                )}

                <Tooltip content="Helpful response" position="top">
                  <button
                    type="button"
                    onClick={() => handleThumbs(1)}
                    className={`flex items-center justify-center size-7 rounded-[6px] transition-colors duration-100 cursor-pointer ${
                      isLiked ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold scale-105" : "text-ink-3 hover:bg-hover-2 hover:text-green"
                    }`}
                  >
                    {ACTION_ICONS.up}
                  </button>
                </Tooltip>

                <Tooltip content="Needs improvement" position="top">
                  <button
                    type="button"
                    onClick={() => handleThumbs(-1)}
                    className={`flex items-center justify-center size-7 rounded-[6px] transition-colors duration-100 cursor-pointer ${
                      isDisliked ? "bg-red/20 text-red font-bold scale-105" : "text-ink-3 hover:bg-hover-2 hover:text-red"
                    }`}
                  >
                    {ACTION_ICONS.down}
                  </button>
                </Tooltip>

                <Tooltip content={isPlayingAudio ? "Stop HD Voice" : isLoadingAudio ? "Synthesizing HD Voice..." : "Read Aloud (HD Neural Voice)"} position="top">
                  <button
                    type="button"
                    onClick={() => handleTTS()}
                    disabled={isLoadingAudio}
                    className={`flex size-7 items-center justify-center rounded-[6px] transition-colors duration-100 hover:bg-hover-2 cursor-pointer ${
                      isPlayingAudio ? "text-accent bg-accent/15 animate-pulse" : isLoadingAudio ? "text-orange" : "text-ink-3 hover:text-ink-2"
                    }`}
                  >
                    {isLoadingAudio ? (
                      <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83" />
                      </svg>
                    ) : (
                      ACTION_ICONS.tts
                    )}
                  </button>
                </Tooltip>

                <Tooltip content={`Voice Speed: ${ttsSpeed}x (Click to cycle)`} position="top">
                  <button
                    type="button"
                    onClick={cycleTtsSpeed}
                    className={`flex items-center justify-center px-1.5 py-0.5 rounded-[6px] text-[10px] font-mono font-bold transition-all duration-150 cursor-pointer border ${
                      ttsSpeed !== 1.0
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 animate-pulse shadow-sm"
                        : "text-ink-3 hover:text-ink-2 bg-hover-2/50 border-transparent hover:border-line"
                    }`}
                  >
                    {ttsSpeed}x
                  </button>
                </Tooltip>

                <Tooltip content={`Voice Tone: ${ttsExpressivity === -2 ? "Robot" : ttsExpressivity === -1 ? "Calm" : ttsExpressivity === 1 ? "Animated" : ttsExpressivity === 2 ? "Expressive" : "Normal"} (Click to cycle)`} position="top">
                  <button
                    type="button"
                    onClick={cycleTtsExpressivity}
                    className="flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium transition-all cursor-pointer border border-black/[0.08] dark:border-white/[0.08] bg-transparent text-ink-3 dark:text-zinc-400 hover:text-ink dark:hover:text-zinc-200 hover:border-black/20 dark:hover:border-white/20"
                  >
                    <span>
                      {ttsExpressivity === -2 ? "Robot" : ttsExpressivity === -1 ? "Calm" : ttsExpressivity === 1 ? "Animated" : ttsExpressivity === 2 ? "Expressive" : "Normal"}
                    </span>
                  </button>
                </Tooltip>
              </div>

              {/* Answer Completion Timestamp pushed to Right End */}
              {timeStr && (
                <Tooltip content="Answer Completion Timestamp" position="top">
                  <span className="text-[10.5px] font-mono font-medium text-ink-3/70 select-none shrink-0 ml-auto pl-2">
                    {timeStr}
                  </span>
                </Tooltip>
              )}
            </div>

            {/* Row 2: Model Badge (Left) & Sources Button (Pushed to Right End) */}
            {(message.token_metrics || sources.length > 0) && (
              <div className="flex items-center justify-between gap-2 w-full min-w-0 mt-0.5">
                <div>
                  {message.token_metrics && (
                    <TokenCostBadge metrics={message.token_metrics} isOpen={statsOpen} onClick={() => setStatsOpen(prev => !prev)} />
                  )}
                </div>

                {sources.length > 0 && (
                  <button
                    type="button"
                    aria-expanded={sourcesOpen}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSourcesOpen((current) => !current);
                    }}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-150 border border-line shadow-hairline cursor-pointer shrink-0 ml-auto ${
                      sourcesOpen
                        ? "bg-hover text-ink shadow-xs font-semibold border-line-strong"
                        : "bg-transparent hover:bg-hover text-ink-2 hover:text-ink"
                    }`}
                  >
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-accent"
                    >
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <span className="tabular-nums font-mono text-ink-2">
                      {sources.length} {sources.length === 1 ? "source" : "sources"}
                    </span>
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className={`transition-transform duration-200 ${sourcesOpen ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Minimal & Small Expandable Sources Panel */}
        {sourcesOpen && sources.length > 0 && (
          <div className="w-full rounded-xl bg-surface/95 dark:bg-[#14151a]/95 text-ink dark:text-[#f4f3ee] mt-1.5 mb-1 p-2 border border-black/[0.06] dark:border-white/[0.06] shadow-xs backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-black/[0.06] dark:border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[#10b981]">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <span className="text-[10.5px] font-bold text-ink dark:text-[#f4f3ee]">
                  Verified Grounding Sources
                </span>
              </div>
              <span className="text-[9.5px] px-2 py-0.2 rounded-full bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.06] text-ink-3 dark:text-[#b1ada1] font-mono font-medium">
                {sources.length} {sources.length === 1 ? "document" : "documents"}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              {sources.map((source, idx) => {
                const fileName = source.source_file
                  ? source.source_file.replace(/\.php$/i, '.md')
                  : (source.title || "").replace(/\.php$/i, '.md');
                return (
                  <div
                    key={source.chunk_id || idx}
                    className="flex items-center justify-between w-full rounded-lg px-2.5 py-1 text-[10.5px] font-medium bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.04] transition-all cursor-default"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <span className="flex size-4 items-center justify-center rounded-full bg-[#2E6B5E]/15 dark:bg-[#10b981]/20 text-[#2E6B5E] dark:text-[#10b981] font-bold text-[9px] shrink-0 border border-[#2E6B5E]/20 dark:border-[#10b981]/30">
                        {idx + 1}
                      </span>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3 dark:text-[#b1ada1] shrink-0">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="truncate font-mono text-[10.5px] font-medium text-ink dark:text-[#f4f3ee]">
                        {fileName}
                      </span>
                    </div>
                    <span className="text-[8.5px] px-1.5 py-0.2 rounded-full bg-[#10b981]/10 dark:bg-[#10b981]/15 text-[#10b981] dark:text-[#34d399] font-mono shrink-0 font-medium border border-[#10b981]/20">
                      RAG Verified
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMsg && (
          <div className="mt-2 text-[12px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg w-fit animate-in fade-in duration-150">
            {toastMsg}
          </div>
        )}

        {/* NeMo Reranker Re-evaluate Action Banner on Dislike */}
        {isDisliked && onRegenerateWithNeMo && (
          <div className="mt-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/30 text-[12px] text-emerald-800 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-600 dark:text-emerald-400 shrink-0">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>Dissatisfied? Re-evaluate using <strong>NVIDIA Nemotron Neural Re-ranker (nvidia/llama-nemotron-rerank-1b-v2)</strong> & Colang 2.0 Guardrails</span>
            </div>
            <button
              type="button"
              onClick={() => onRegenerateWithNeMo(userQuery || message.content, message.id)}
              className="shrink-0 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-sm transition-all cursor-pointer"
            >
              Re-evaluate with NeMo
            </button>
          </div>
        )}

        {/* Expandable Usage/Stats Panel */}
        {statsOpen && message.token_metrics && (
          <div className="mt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
            <TokenCostPanel metrics={message.token_metrics} />
          </div>
        )}

        {/* Contextual Follow-up Prompts */}
        {isLatestMessage && !message.is_streaming && message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-5 sm:pl-7 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="text-[11.5px] font-semibold text-ink-3 dark:text-zinc-400 mb-2 pl-1">Follow-ups</div>
            <div className="flex flex-col gap-1.5">
              {message.suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => onSendPrompt?.(suggestion)}
                  className="group flex items-center gap-2.5 w-full py-2 px-3 rounded-xl text-left transition-all bg-surface/40 dark:bg-zinc-900/40 hover:bg-[#2E6B5E]/10 dark:hover:bg-emerald-500/10 border border-line/30 dark:border-white/[0.04] cursor-pointer"
                >
                  <svg 
                    width="14" 
                    height="14" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    className="text-[#2E6B5E] dark:text-[#10b981] font-bold shrink-0 transition-transform group-hover:scale-110"
                  >
                    <path d="M9 10l-5 5 5 5" />
                    <path d="M4 15h12a4 4 0 0 0 4-4v-4" />
                  </svg>
                  <span className="text-[12.5px] text-ink-2 dark:text-zinc-300 group-hover:text-ink dark:group-hover:text-white transition-colors">
                    {suggestion}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Feedback Modal */}
      {isFeedbackOpen && feedbackRating && onSubmitFeedback && (
        <FeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
          rating={feedbackRating}
          sessionId={sessionId}
          messageId={message.id}
          queryText={userQuery || "MSAJCEA Campus Inquiry"}
          responseText={message.content}
          onSubmit={onSubmitFeedback}
          onRegenerateWithNeMo={onRegenerateWithNeMo ? () => onRegenerateWithNeMo(userQuery || message.content) : undefined}
        />
      )}

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed bottom-24 right-4 sm:right-8 z-50 rounded-xl bg-zinc-900/90 text-white dark:bg-white/95 dark:text-zinc-950 px-4 py-2.5 text-xs font-bold shadow-2xl backdrop-blur-md border border-white/10 dark:border-black/10 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toastMsg}
        </div>
      )}
    </div>
  );
});

export default MessageItem;


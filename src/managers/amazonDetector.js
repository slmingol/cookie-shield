/**
 * Amazon Affiliate Detector
 *
 * Detects Amazon affiliate links through URL parameters and page content.
 */

const AMAZON_DOMAINS = [
  'amazon.com', 'amazon.co.uk', 'amazon.ca', 'amazon.de', 'amazon.fr',
  'amazon.it', 'amazon.es', 'amazon.in', 'amazon.co.jp', 'amazon.com.mx',
  'amazon.com.br', 'amazon.com.au', 'amazon.nl', 'amazon.sg', 'amazon.ae',
  'amazon.sa', 'amazon.se', 'amazon.pl', 'amazon.tr', 'amazon.be', 'amazon.eg', 'amazon.cn'
];

const AFFILIATE_PARAMS = [
  'tag', 'ascsubtag', 'linkId', 'ref', 'linkCode', 'creative', 'creativeASIN',
  'camp', 'th', 'psc', 'ref_', 'aaxitk', 'pd_rd_w', 'pd_rd_r', 'pf_rd_p', 'pf_rd_r', 'sprefix', 'ie'
];

const REFERENCE_PARAMS = [
  'as_li_ss_tl', 'as_li_ss_il', 'as_li_tl_il'
];

const amazonAffiliateDetector = {
  AMAZON_DOMAINS,
  AFFILIATE_PARAMS,
  REFERENCE_PARAMS,

  // Validate Amazon affiliate tag format
  isValidAffiliateTag(tag) {
    if (!tag || typeof tag !== 'string') return false;
    return /-\d{2}/.test(tag);
  },

  isAmazonDomain(hostname) {
    return AMAZON_DOMAINS.some(domain =>
      hostname === domain ||
      hostname.endsWith('.' + domain) ||
      hostname.match(/^[\w-]+\.amazon\.[a-z.]{2,}$/)
    );
  },

  isAmazonUrl(url) {
    try {
      const hostname = new URL(url).hostname;
      return this.isAmazonDomain(hostname);
    } catch (e) {
      return false;
    }
  },

  extractAffiliateParams(url) {
    const params = {};
    const urlObj = url instanceof URL ? url : new URL(url);
    for (const param of AFFILIATE_PARAMS) {
      if (urlObj.searchParams.has(param)) {
        params[param] = urlObj.searchParams.get(param);
      }
    }
    return params;
  },

  extractAffiliateData(url) {
    try {
      const parsedUrl = url instanceof URL ? url : new URL(url);
      const params = parsedUrl.searchParams;
      const tag = params.get('tag');
      if (tag && this.isValidAffiliateTag(tag)) {
        const affiliateId = tag.split('-')[0];
        const affiliateData = {
          url: parsedUrl.href,
          affiliateId,
          fullTag: tag,
          parameters: this.extractAffiliateParams(parsedUrl)
        };
        const ref = params.get('ref_');
        if (ref && REFERENCE_PARAMS.some(pattern => ref.includes(pattern))) {
          affiliateData.parameters['ref_'] = ref;
        }
        return affiliateData;
      }
      const otherParams = AFFILIATE_PARAMS.filter(p => p !== 'tag');
      const hasOtherParams = otherParams.some(param => params.has(param));
      const ref = params.get('ref_');
      const hasRefParam = ref && REFERENCE_PARAMS.some(pattern => ref.includes(pattern));
      if (hasOtherParams || hasRefParam) {
        const affiliateData = {
          url: parsedUrl.href,
          affiliateId: 'unknown',
          parameters: {}
        };
        otherParams.forEach(param => {
          if (params.has(param)) {
            affiliateData.parameters[param] = params.get(param);
          }
        });
        if (hasRefParam) {
          affiliateData.parameters['ref_'] = ref;
        }
        return affiliateData;
      }
      if ([
        '/ref=', '/gp/product', '/gp/offer-listing', '/gp/aw/d/'
      ].some(p => parsedUrl.pathname.includes(p))) {
        return {
          url: parsedUrl.href,
          affiliateId: 'unknown',
          parameters: {},
          pathBased: true
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  checkAffiliateUrl(urlString) {
    try {
      const url = new URL(urlString);
      if (!this.isAmazonDomain(url.hostname)) return false;
      const tag = url.searchParams.get('tag');
      if (tag && this.isValidAffiliateTag(tag)) {
        return {
          isAffiliate: true,
          affiliateId: tag,
          type: 'url',
          network: 'amazon',
          source: urlString,
          params: this.extractAffiliateParams(url)
        };
      }
      if (
        url.searchParams.has('linkCode') ||
        url.searchParams.has('linkId') ||
        (url.searchParams.has('ref_') && url.searchParams.get('ref_').includes('as_li_'))
      ) {
        return {
          isAffiliate: true,
          affiliateId: url.searchParams.get('linkCode') || url.searchParams.get('linkId') || 'unknown',
          type: 'url',
          network: 'amazon',
          source: urlString,
          params: this.extractAffiliateParams(url)
        };
      }
      return false;
    } catch (e) {
      return false;
    }
  }

};

if (typeof self !== 'undefined') {
  self.amazonAffiliateDetector = amazonAffiliateDetector;
}
if (typeof window !== 'undefined') {
  window.amazonAffiliateDetector = amazonAffiliateDetector;
} 
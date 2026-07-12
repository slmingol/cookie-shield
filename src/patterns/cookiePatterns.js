const affiliateCookiePatterns = {
  
  // Commission Junction
  'CJ': {
    thirdParty: {
      patterns: ['cje', '_cjevent', 'cid', 'cjevent', 'LCLK'],
      domains: [
        '.commission-junction.com', '.anrdoezrs.net', '.dpbolvw.net',
        '.tkqlhce.com', '.jdoqocy.com', '.kqzyfj.com', '.emjcd.com', 'mczbf.com'
      ]
    },
    firstParty: {
      patterns: ['cje_', 'cj_', '_cj', 'cjdata','cjevent']
    }
  },
  // Rakuten
  'rakuten': {
    thirdParty: {
      patterns: ['lsclick_mid', 'rtoken', 'cID'],
      domains: ['.linksynergy.com']
    },
    firstParty: {
      patterns: ['rakuten_', 'rmAddTrans']
    }
  },
  // Awin
  'awin': {
    thirdParty: {
      patterns: ['aw'],
      domains: ['.awin1.com', '.zenaps.com']
    },
    firstParty: {
      patterns: ['aw_', '_aw_m_', '_aw_sn_', 'awin_awc', 'awin_source']
    }
  },
  // ShareASale
  'shareasale': {
    thirdParty: {
      patterns: ['sscid', 'sstid'],
      domains: ['.shareasale.com']
    },
    firstParty: {
      patterns: ['shareasale_', 'sas_', '_sas_', 'sas_m_awin']
    }
  },
  
  // Adcell
  'adcell': {
    thirdParty: {
      patterns: ['adcell', '_adcell_'],
      domains: ['.adcell.de', '.adcell.com']
    },
    firstParty: {
      patterns: ['adcell_', '_adcell', 'adcData']
    }
  },

  // Afilio
  'afilio': {
    thirdParty: {
      patterns: ['afilio', '_afilio_'],
      domains: ['.afilio.com']
    },
    firstParty: {
      patterns: ['afilio_', 'afilioData']
    }
  },

  // Affiliate Future
  'affiliateFuture': {
    thirdParty: {
      patterns: ['af_id', 'af_site','MP'],
      domains: ['.affiliatefuture.co.uk', '.affiliatefuture.com', 'tags.affiliatefuture.com']
    },
    firstParty: {
      patterns: ['af_', 'aftrk_','affc']
    }
  },

  // Avantlink
  'avantlink': {
    thirdParty: {
      patterns: ['avantlink', 'avantLinkClickId', '_av_','merchant_id_'],
      domains: ['.avantlink.com']
    },
    firstParty: {
      patterns: ['aval_', '_avant', 'avantlink_']
    }
  },

  // Commission Factory
  'commissionFactory': {
    thirdParty: {
      patterns: ['_cf_', 'commissionfactory', '__cf_bm_'],
      domains: ['.commissionfactory.com']
    },
    firstParty: {
      patterns: ['cfjump-click', 'cftracking']
    }
  },
  // Daisycon
  'daisycon': {
    thirdParty: {
      patterns: ['DCI', 'PDC'],
      domains: [
        '.at19.net', '.bdt9.net', '.curli.no', '.ds1.nl',
        '.dt51.net', '.fr135.net', 
        '.glp8.net', '.jdt8.net', '.jf79.net', '.lt45.net',
        '.ndt5.net', '.rkn3.net'
      ]
    },
    firstParty: {
      patterns: []
    }
  },
  // Glopss
  'glopss': {
    thirdParty: {
      patterns: ['glopss', '_glopss_'],
      domains: ['.glopss.com']
    },
    firstParty: {
      patterns: ['glopss_', '_glopss']
    }
  },
  // Impact
  'impact': {
    thirdParty: {
      patterns: [
        'irclickid', 'irgwc', 'irld'
      ],
      domains: [
        // Base domains
        '.sjv.io', '.pxf.io', 'goto.impact.com',
        '.7eer.net', '.7tiv.net', '.evyy.net', '.vzew.net', '.cfzu.net',
        // Numbered domains
        '.2uf4ta.net', '.2xje.net', '.2xc8.net', '.27exom.net', '.3qcw.net',
        '.3tpfen.net', '.3tvl.net', '.3v3rmf.net', '.3xvk.net', '.4byfvk.net',
        '.4drrzr.net', '.4fmm4z.net', '.4g9yrz.net', '.4paxeq.net', '.4qxjn9.net',
        '.4xc4ep.net', '.43a8.net', '.5ad6.net', '.5d3x.net', '.5l5h.net',
        '.5nfc.net', '.5sfo.net', '.62kb.net', '.648q.net', '.6uu72h.net',
        '.6x7g.net', '.74az.net', '.74rjtv.net', '.74wq.net', '.74xz8u.net',
        '.775j.net', '.77jaha.net', '.79ic8e.net', '.7lg23b.net', '.7no9.net',
        '.7q8j.net', '.7qto.net', '.7sb2uw.net', '.7voo.net', '.7w7o67.net',
        '.7ymy.net', '.7zd4df.net', '.82rc.net', '.83ckgt.net', '.8aog.net',
        '.8ibi.net', '.8kpa2n.net', '.8lvxaf.net', '.8n4773.net', '.8s4u9r.net',
        '.8ujrgu.net', '.8utb.net', '.8v4lqg.net', '.8zgmnp.net', '.8zwg.net',
        '.93n6tx.net', '.9i9b.net', '.9pctbx.net', '.9quv.net', '.9u2rlz.net',
        '.9yde.net', '.9yoxzr.net', '.9zpg.net',
        // A-D domains
        '.a49tr6.net', '.a9yw.net', '.aqpq.net', '.attfm2.net', '.atkw.net', '.auhm.net', 
        '.audw.net', '.awb5.net','.blihtq.net', '.bop8.net', '.bpu9.net',
        '.bts6.net', '.bvrd.net', '.btyhsg.net', '.bwa8.net', '.bxvfun.net',
        '.c2ukkg.net', '.c3nu2i.net', '.c5l5.net',
        '.d67ag4.net', '.dkkdet.net', '.dodxnr.net', '.drn3.net', 
        '.dne9je.net','.dttq.net', '.dubn.net',
        // E-H domains
        '.ebml.net', '.eqcm.net', '.eqwh.net', '.ewrvdi.net', '.e8i7.net', '.e9jo.net', '.e9ppfh.net',
        '.eyip.net', '.eyjo.net', '.f6rcao.net',
        '.ffxwxg.net', '.fhsxpf.net', '.fi2z.net', '.fum2sp.net', '.f9tmep.net',
        '.glg9ob.net', '.gqco.net', '.g7ix2j.net', '.gtlppj.net', '.gtlptb.net',
        '.hbbswr.net', '.hblm3c.net', '.h3wdt8.net', '.hjef.net', '.hmqldu.net',
        '.hmxg.net', '.hnyj8s.net', '.h4km.net', '.hq6ajo.net', '.hyyc7q.net', '.emjcd.com',
        // I domains
        '.i104546.net', '.i105279.net', '.i105386.net', '.i107215.net',
        '.i108736.net', '.i111827.net', '.i114090.net', '.i116503.net',
        '.i117711.net', '.i121497.net', '.i123723.net', '.i127448.net',
        '.i128439.net', '.i134524.net', '.i136221.net', '.i139476.net',
        '.i141006.net', '.i141429.net', '.i141602.net', '.i141782.net',
        '.i144304.net', '.i154272.net', '.i156748.net', '.i157428.net',
        '.i163361.net', '.i163678.net', '.i164922.net', '.i181536.net',
        '.i182465.net', '.i183635.net', '.i184500.net', '.i184621.net',
        '.i185592.net', '.i203761.net', '.i204706.net', '.i213011.net',
        '.i215644.net', '.i217056.net', '.i222331.net', '.i222351.net',
        '.i225013.net', '.i225111.net', '.i229304.net', '.i229745.net',
        '.i240138.net', '.i246054.net', '.i256749.net', '.i261257.net',
        '.i263265.net', '.i271380.net', '.i277339.net', '.i285710.net',
        '.i294747.net', '.i295461.net', '.i295768.net', '.i298770.net',
        '.i301580.net', '.i302434.net', '.i308314.net', '.i310051.net',
        '.i317579.net', '.i326929.net', '.i331371.net', '.i331902.net',
        '.i334637.net', '.i335971.net', '.i339540.net', '.i344083.net',
        '.i346552.net', '.i357806.net', '.i363662.net', '.ibfwsl.net',
        '.igs4ds.net', '.ijrn.net', '.iln8.net', '.ilwyv3.net', '.invol.co',
        // J-P domains
        '.j4df.net', '.j8ujgp.net', '.jewn.net', '.jkwjpk.net', '.jv6k.net',
        '.jyae.net', '.k77v.net', '.kd4a.net',
        '.kffcyy.net', '.kk2kau.net', '.kqzyfj.com', '.kwpkyy.net',
        '.krym8q.net', '.ldaz.net', '.ldw66v.net', '.l49yho.net', '.lf49oc.net',
        '.li9jiy.net', '.lvuv.net', '.m4ibck.net', '.m768hc.net', '.mkr3.net',
        '.mno8.net', '.mrlph3.net', '.mtko.net', '.mw46.net', '.mwztt8.net',
        '.ng4cgr.net', '.ngi2ba.net', '.njih.net', '.nd8t.net', '.nkwcmr.net',
        '.nrku7u.net', '.ntaf.net', '.nzvz.net',
        '.o6eiov.net', '.oack.net', '.oaccss.net', '.obak77.net', '.obdh.net',
        '.ojrq.net', '.oloiyb.net', '.opfm.net', '.ork2.net',
        '.ow29pp.net', '.oy8hzn.net', '.p3oc.net',
        '.pa4kxy.net', '.prf.hn', '.pvxt.net',
        // Q-T domains
        '.q3qw.net', '.q77h.net', '.qflm.net', '.qvig.net', '.qq3wj3.net',
        '.qumg.net', '.r37x9j.net', '.r69o.net', '.r7kg.net', '.rfvk.net',
        '.rw9xb6.net', '.rvgu.net', '.rvsspp.net', '.ryvx.net', '.s4lle7.net',
        '.shrw9t.net', '.sk2bvq.net', '.ssxmnr.net', '.syuh.net',
        '.t2bw9u.net', '.t7c9v8.net', '.tbthfv.net', '.tcux.net',
        '.tk2x2c.net', '.tmfhgn.net', '.tm7516.net', '.tm7569.net',
      
        // U-Z domains
        '.u7lr6p.net', '.u97e.net', '.ue7a.net', '.uewp.net', '.uisv.net',
        '.uikc.net', '.uqhv.net', '.ustnul.net', '.uvwgb9.net', '.ubigi.com',
        '.vqi8.net', '.vegb.net', '.vfjm.net', '.vocq.net', '.vwz6.net',
        '.vrivoq.net', '.vz7pkt.net', '.vzck.net', '.vvtnn9.net',
        '.wo8g.net', '.wfraqy.net', '.wk5q.net', '.wsslc4.net',
        '.wxc9hm.net', '.x57o.net', '.xayxet.net', '.xb398u.net', '.xhuc.net',
        '.xibx.net', '.xk3g.net', '.xkri.net', '.xkpq.net', '.xrx2ci.net',
        '.xyibsh.net', '.y8uw.net', '.ydij.net', '.ydow.net', '.ygwk.net',
        '.yoxl.net', '.yvzx.net', '.uym8.net', '.z6rjha.net', '.zafxzt.net',
        '.zgkv.net', '.zlwlj8.net', '.ztk5.net', '.zvq6.net', '.zz6n.net'
      ]
    },
    firstParty: {
      patterns: ['_ir_', 'impact_', 'impactData', 'iradius_']
    }
  },

  // Involve Asia
  'involveAsia': {
    thirdParty: {
      patterns: ['_ia_', 'involve', '_inv_'],
      domains: ['.involve.asia', '.involveasia.com']
    },
    firstParty: {
      patterns: ['involve_', '_involve', 'iaff_']
    }
  },

  // Kwanko (formerly NetAffiliation)
  'kwanko': {
    thirdParty: {
      patterns: ['kwanko', '_kwanko_', 'netaffiliation'],
      domains: ['.kwanko.com', '.netaffiliation.com']
    },
    firstParty: {
      patterns: ['kwk_', '_kwanko', 'netaff_']
    }
  },

  // LinkConnector
  'linkConnector': {
    thirdParty: {
      patterns: ['uts_lctid_'],
      domains: ['.linkconnector.com']
    },
    firstParty: {
      patterns: ['uts_lctid'],
    }
  },

  // Optimise (Optimise Media)
  'optimise': {
    thirdParty: {
      patterns: ['optimise', '_opt_'],
      domains: ['.optimisemedia.com', '.optimiseit.co.uk']
    },
    firstParty: {
      patterns: ['_optimise', 'optmedia_']
    }
  },

  // Partnerize (formerly Performance Horizon)
  'partnerize': {
    thirdParty: {
      patterns: ['tPHG-PS'],
      domains: ['.prf.hn']
    },
    firstParty: {
      patterns: ['clickrefid']
    }
  },

  // Pepperjam (PJ)
  'pepperjam': {
    thirdParty: {
      patterns: ['pjn_cookie_'],
      domains: ['.pepperjam.com', '.pepperjamnetwork.com', '.pjatr.com']
    },
    firstParty: {
      patterns: ['pj_', '_pj', 'ppjam_']
    }
  },

  // Soicos
  'soicos': {
    thirdParty: {
      patterns: ['soicos', '_soicos_'],
      domains: ['.soicos.com']
    },
    firstParty: {
      patterns: ['soicos_', '_soic']
    }
  },


  // TradeDoubler
  'tradeDoubler': {
    thirdParty: {
      patterns: ['GUID'],
      domains: ['.tradedoubler.com', '.tradedoubler.net']
    },
    firstParty: {
      patterns: ['tduid']
    }
  },

  // TradeTracker
  'tradeTracker': {
    thirdParty: {
      patterns: ['__tdat', '__tgdat'],
      domains: ['.tradetracker.net', '.tradetracker.com']
    },
    firstParty: {
      patterns: ['_tradetracker', 'ttrk_']
    }
  },

  // Tune / HasOffers
  'tune': {
    thirdParty: {
      patterns: ['ho_m', '_hoff_', '_ho_', 'hsrc', 'hasoffers'],
      domains: ['.hasoffers.com', '.tune.com']
    },
    firstParty: {
      patterns: ['tune_', '_tune', 'ho_', 'hasof_']
    }
  },

  // vCommission
  'vcommission': {
    thirdParty: {
      patterns: ['vcommission', '_vc_', '_vcm_','vc_'],
      domains: ['.vcommission.com']
    },
    firstParty: {
      patterns: ['_vcom', 'vcmsn_']
    }
  },

  // WebGains
  'webgains': {
    thirdParty: {
      patterns: ['webgains', '_wg_', 'wgcampaign', '__CK__WG__'],
      domains: ['.webgains.com']
    },
    firstParty: {
      patterns: ['wg_', '_webgains', 'wgn_','__CK__WG__']
    }
  },

  // Howl Links
  'howllinks': {
    thirdParty: {
      patterns: ['clickIds'],
      domains: ['.howl.link']
    },
    firstParty: {
      patterns: []
    }
  }

};

// Expose for global access if in page context
if (typeof window !== 'undefined') {
  window.affiliateCookiePatterns = affiliateCookiePatterns;
}

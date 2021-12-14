const modelProyek = require('../model/proyek');
const modelUser = require('../model/user');
const modelFeed = require('../model/feed');
const id = require('../helpers/id');
const handle_error = require('../handler/error_controller');
const handle_user = require('../handler/user');

module.exports = {
    add: async (req, res, next) => {
        await modelProyek.find({ proyek: req.body.proyek })
            .then(async proyek => {
                if (proyek[0]) {
                    return res.status(427).json({
                        status: false,
                        message: "project available"
                    });
                } else {
                    let id_project = "proyek-" + id.createId();
                    let decode = req.context.jwtHelper.decodeFromHeader(req);
                    let user_id = decode.user;
                    let newProyek = new modelProyek({
                        proyek_id: id_project,
                        proyek: req.body.proyek,
                        lokasi_id: req.body.lokasi_id,
                    });
                    await newProyek.save()
                        .then(async (proyek) => {

                            let newUser = ({
                                proyek_id: id_project
                            });

                            await modelUser.updateOne({ user_id: user_id }, { $set: newUser })
                                .then(async (user) => {
                                    if (user.nModified == 0) {
                                        return res.status(404).json({
                                            status: false,
                                            message: "Data not found"
                                        });
                                    } else {
                                        return res.status(200).json({
                                            status: true,
                                            id: id_project,
                                            message: "Data Modified"
                                        });
                                    }
                                })
                                .catch(error => {
                                    return handle_error.db_error(res, error, 'Project');
                                })
                        })
                        .catch(error => {
                            return handle_error.db_error(res, error, 'project');
                        })
                }
            }).catch(error => {
                return handle_error.db_error(res, error, 'project');
            })
    },
    get: async (req, res, next) => {
        var search = req.query.name;

        await modelProyek.find({
            $or: [
                { lokasi_id: req.query.lokasi_id },
                { proyek_id: req.query.proyek_id },
                { proyek: { $regex: '.*' + search + '.*', $options: 'i' } }
            ]
        }, { _id: 0, proyek_id: 1, proyek: 1, lokasi_id: 1 })
            .sort({ proyek: -1 })
            .then(device => {
                if (device[0]) {
                    return res.status(200).json({
                        status: true,
                        data: device
                    });
                } else {
                    return res.status(404).json({
                        status: false,
                        message: "data not found"
                    });
                }
            }).catch(error => {
                return handle_error.db_error(res, error, 'project');
            })
    },
    getAll: async (req, res, next) => {
        const item = 20;
        const page = (req.query.page - 1) * item;

        await modelProyek.find()
            .countDocuments()
            .then(async countproyek => {
                if (countproyek == 0) {
                    return res.status(400).json({
                        status: false,
                        message: "data not found"
                    });
                } else {
                    await modelProyek.aggregate([
                        {
                            $lookup: {
                                from: "lokasis",
                                localField: "lokasi_id",
                                foreignField: "lokasi_id",
                                as: "lokasi"
                            }
                        },
                        { $unwind: "$lokasi" },
                        {
                            $project: {
                                _id: 0,
                                proyek_id: 1,
                                proyek: 1,
                                lokasi_id: 1,
                                lokasi: "$lokasi.lokasi"
                            }
                        }
                    ])
                        .sort({ proyek: -1 })
                        .skip(Number(page))
                        .limit(item)
                        .then(proyek => {
                            if (proyek[0]) {
                                return res.status(200).json({
                                    status: true,
                                    page: Number(req.query.page),
                                    page_total: parseInt(countproyek / 20) + 1,
                                    total_data: countproyek,
                                    data: proyek
                                });
                            } else {
                                return res.status(404).json({
                                    status: false,
                                    message: "data not found"
                                });
                            }
                        }).catch(error => {
                            return handle_error.db_error(res, error, 'user');
                        })
                }
            }).catch(error => {
                return handle_error.db_error(res, error, 'user');
            });
    },
    update: async (req, res, next) => {
        const newProyek = {
            proyek: req.body.proyek,
            lokasi_id: req.body.lokasi_id,
        };
        await modelProyek.updateOne({ proyek_id: req.body.proyek_id }, { $set: newProyek })
            .then(proyek => {
                if (proyek) {
                    if (proyek.nModified == 0) {
                        return res.status(404).json({
                            status: false,
                            message: "Data not found"
                        });
                    } else {
                        return res.status(200).json({
                            status: true,
                            message: "Data Modified"
                        });
                    }
                } else {
                    return res.status(400).json({ "message": "data not found" });
                }
            })
            .catch(error => {
                return handle_error.db_error(res, error, 'project');
            })
    },
    delete: async (req, res, next) => {
        const proyek_id = req.body.proyek_id
        await modelProyek.deleteOne({ proyek_id: proyek_id })
            .then(proyek => {
                if (proyek.deletedCount == 0) {
                    return res.status(404).json({
                        status: false,
                        message: "Data not found"
                    });
                } else {
                    handle_user.removeProyek(proyek_id);
                    return res.status(200).json({
                        status: true,
                        message: "Data deleted"
                    });
                }
            })
            .catch(error => {
                return handle_error.db_error(res, error, 'project');
            })
    },
    bind: async (req, res, next) => {
        const list_id = req.body.list_id;
        const proyek_id = req.body.proyek_id;
        console.log(list_id);

        await modelUser.updateMany(
            { user_id: { $in: list_id } },
            { $set: { proyek_id: proyek_id } },
            { multi: true })
            .then(proyek => {
                console.log(proyek);

                if (proyek) {
                    if (proyek.nModified == 0) {
                        return res.status(404).json({
                            status: false,
                            message: "Data not found"
                        });
                    } else {
                        return res.status(200).json({
                            status: true,
                            message: "Data Modified"
                        });
                    }
                } else {
                    return res.status(400).json({ "message": "data not found" });
                }
            })
            .catch(error => {
                return handle_error.db_error(res, error, 'project');
            })
    },
    sortLow: async (req, res, next) => {
        //var search = req.query.proyek;

        await modelProyek.find()
            .sort({ proyek: -1 })
            .then(async device => {
                if (device[0]) {
                    
                    var type_proyek= [
                            { "$unwind": "$proyek_id"},
                            {
                               "$group": {
                                  "_id": {
                                     "Name": "$proyek_id",
                                  },
                                  "count": { "$sum": 1 }
                              }
                            },
                         ];
                         
                    const jenisPelanggaran = await modelFeed.aggregate(type_proyek).sort({count: 1});
                    console.log(jenisPelanggaran);
                  
                    //const totalLaporan = await modelProyek.find().countDocuments();
                    //console.log(`Jumlah Proyek: ${JSON.stringify(totalLaporan)}`);
                    return res.status(200).json({
                        status: true,
                        data: device,
                        message: "Testing",
                        jenis_pelanggaran: JSON.stringify(jenisPelanggaran)                          
                    })
                 
                } else {
                    return res.status(404).json({
                        status: false,
                        message: "data not found"
                    });
                }
            }).catch(error => {
                return handle_error.db_error(res, error, 'project');
            })
    },
    sortHigh: async (req, res, next) => {
        //var search = req.query.proyek;

        await modelProyek.find()
            .sort({ proyek: -1 })
            .then(async device => {
                if (device[0]) {
                    
                    var type_proyek= [
                            { "$unwind": "$proyek_id"},
                            {
                               "$group": {
                                  "_id": {
                                     "Name": "$proyek_id",
                                  },
                                  "count": { "$sum": 1 }
                              }
                            },
                           
                         ];
                         
                    const jenisPelanggaran = await modelFeed.aggregate(type_proyek).sort({count: -1});
                    console.log(jenisPelanggaran);
                  
                    //const totalLaporan = await modelProyek.find().countDocuments();
                    //console.log(`Jumlah Proyek: ${JSON.stringify(totalLaporan)}`);
                    return res.status(200).json({
                        status: true,
                        data: device,
                        message: "Testing",
                        jenis_pelanggaran: JSON.stringify(jenisPelanggaran)                                          
                                                            
                    })
           
                } else {
                    return res.status(404).json({
                        status: false,
                        message: "data not found"
                    });
                }
            }).catch(error => {
                return handle_error.db_error(res, error, 'project');
            })
    },
    closingLow: async (req, res, next) => {
        //var search = req.query.proyek;

        await modelProyek.find()
            .sort({ proyek: -1 })
            .then(async device => {
                if (device[0]) {
                    
                    var type_proyek= [
                            { "$unwind": "$proyek_id"},
                            {
                               "$group": {
                                  "_id": {
                                     "Name": "$proyek_id",
                                     "closing": "$status"
                                  },
                                  "count": { "$sum": 1 }
                              }
                            },
                            {"$match": {"_id.closing": true}},
                         ];
                         
                    const jenisPelanggaran = await modelFeed.aggregate(type_proyek).sort({count: 1});
                    console.log(jenisPelanggaran);
                  
                    //const totalLaporan = await modelProyek.find().countDocuments();
                    //console.log(`Jumlah Proyek: ${JSON.stringify(totalLaporan)}`);
                    return res.status(200).json({
                        status: true,
                        data: device,
                        message: "Testing",
                        jenis_pelanggaran: JSON.stringify(jenisPelanggaran)                                          
                                                            
                    })
           
                } else {
                    return res.status(404).json({
                        status: false,
                        message: "data not found"
                    });
                }
            }).catch(error => {
                return handle_error.db_error(res, error, 'project');
            })
    },
    closingHigh: async (req, res, next) => {
        //var search = req.query.proyek;

        await modelProyek.find()
            .sort({ proyek: -1 })
            .then(async device => {
                if (device[0]) {
                    
                    var type_proyek= [
                            { "$unwind": "$proyek_id"},
                            {
                               "$group": {
                                  "_id": {
                                     "Name": "$proyek_id",
                                     "closing": "$status"
                                  },
                                  "count": { "$sum": 1 }
                              }
                            },
                            {"$match": {"_id.closing": true}},
                         ];
                         
                    const jenisPelanggaran = await modelFeed.aggregate(type_proyek).sort({count: -1});
                    console.log(jenisPelanggaran);
                  
                    //const totalLaporan = await modelProyek.find().countDocuments();
                    //console.log(`Jumlah Proyek: ${JSON.stringify(totalLaporan)}`);
                    return res.status(200).json({
                        status: true,
                        data: device,
                        message: "Testing",
                        jenis_pelanggaran: JSON.stringify(jenisPelanggaran)                                          
                                                            
                    })
           
                } else {
                    return res.status(404).json({
                        status: false,
                        message: "data not found"
                    });
                }
            }).catch(error => {
                return handle_error.db_error(res, error, 'project');
            })
    },
    perProyek: async (req, res, next) => {
        //var search = req.query.proyek;

        await modelProyek.find({ proyek_id: req.query.proyek_id }, { _id: 0, proyek_id: 1, proyek: 1, lokasi_id: 1 })
            .sort({ proyek: -1 })
            .then(async device => {
                if (device[0]) {
                    
                    var type_pelanggaran= [
                            { "$unwind": "$pelanggaran"},
                            {
                               "$group": {
                                  "_id": {
                                     "Name": "$pelanggaran",
                                  },
                                  "count": { "$sum": 1 }
                              }
                            },
                           
                         ];
                    var type_resiko= [
                            { "$unwind": "$resiko"},
                            {
                               "$group": {
                                  "_id": {
                                     "Name": "$resiko",
                                  },
                                  "count": { "$sum": 1 }
                              }
                            },
                           
                         ];

                    const jenisPelanggaran = await modelFeed.aggregate(type_pelanggaran);
                    console.log(jenisPelanggaran);

                    const jenisResiko = await modelFeed.aggregate(type_resiko);
                    console.log(jenisResiko); 

                    const totalPelanggaran = await modelFeed.find({proyek_id: req.query.proyek_id}).countDocuments();
                    console.log(`jumlah pelanggaran: ${JSON.stringify(totalPelanggaran)}`); 

                    const risiko = await modelFeed.find({proyek_id: req.query.proyek_id}).countDocuments();
                    console.log(`jumlah resiko: ${JSON.stringify(risiko)}`);
                    
                    const rendah = await modelFeed.find({resiko: "rendah",proyek_id: req.query.proyek_id}).countDocuments();
                    console.log(`jumlah pelanggaran rendah: ${JSON.stringify(rendah)}`);

                    const tinggi = await modelFeed.find({resiko: "tinggi",proyek_id: req.query.proyek_id}).countDocuments();
                    console.log(`jumlah pelanggaran tinggi: ${JSON.stringify(tinggi)}`);

                    const closingN = await modelFeed.find({status: "false",proyek_id: req.query.proyek_id}).countDocuments();
                    console.log(`jumlah belum closing: ${JSON.stringify(closingN)}`);

                    const closingY = await modelFeed.find({status: "true",proyek_id: req.query.proyek_id}).countDocuments();
                    console.log(`jumlah sudah closing: ${JSON.stringify(closingY)}`);

                    const totalLaporan = await modelProyek.find({proyek_id: req.query.proyek_id}).countDocuments();
                    console.log(`Jumlah Proyek: ${JSON.stringify(totalLaporan)}`);
                    return res.status(200).json({
                        status: true,
                        data: device,
                        message: "Testing",
                        pelanggaran: JSON.stringify(totalPelanggaran),
                        jenis_pelanggaran: JSON.stringify(jenisPelanggaran),
                        resiko: JSON.stringify(risiko),
                        jenis_resiko: JSON.stringify(jenisResiko),
                        jumlah_Laporan: JSON.stringify(totalLaporan),
                        pelanggaran_rendah: JSON.stringify(rendah),
                        pelanggaran_tinggi: JSON.stringify(tinggi),
                        belum_closing: JSON.stringify(closingN),
                        sudah_closing: JSON.stringify(closingY),                        
                     
                                                 
                    })

                    

                } else {
                    return res.status(404).json({
                        status: false,
                        message: "data not found"
                    });
                }
            }).catch(error => {
                return handle_error.db_error(res, error, 'project');
            })
    },
    proyekTahun: async (req, res, next) => {
        //var search = req.query.proyek;

        await modelProyek.find()
            .sort({ proyek: -1 })
            .then(async device => {
                if (device[0]) {
                    var tnh = req.query.year;
                    var thn = parseInt(tnh,10);
                    console.log(tnh);
                    var type_proyek=  [
                                                
                        //{ "$unwind": "$proyek_id"},
                        {
                           "$group": {
                              "_id": {
                                 "Name": "$proyek_id",
                                 "tahun": { $year: "$time_lapor"}
                              },
                              "count": { "$sum": 1 }
                          },

                        },
                       {"$match": {"_id.tahun": thn}}, //perlu diganti menjadi req.query. done
                     ]
                   const jenisPelanggaran = await modelFeed.aggregate(type_proyek).sort({count: -1});
                    console.log(jenisPelanggaran);
                  
                    //const totalLaporan = await modelProyek.find().countDocuments();
                    //console.log(`Jumlah Proyek: ${JSON.stringify(totalLaporan)}`);
                    return res.status(200).json({
                        status: true,
                        data: device,
                        message: "Testing",
                        jenis_pelanggaran: JSON.stringify(jenisPelanggaran)                                          
                                                            
                    })
           
                } else {
                    return res.status(404).json({
                        status: false,
                        message: "data not found"
                    });
                }
            }).catch(error => {
                return handle_error.db_error(res, error, 'project');
            })
    },
    proyekAllTahun: async (req, res, next) => {
        //var search = req.query.proyek;

        await modelProyek.find()
            .sort({ proyek: -1 })
            .then(async device => {
                if (device[0]) {
                    
                    var type_proyek= [
                            { "$unwind": "$proyek_id"},
                            {
                               "$group": {
                                  "_id": {
                                     "Name": "$proyek_id",
                                     "year": { $year: "$time_lapor"}
                                  },
                                  "count": { "$sum": 1 }
                              },
                            },
                         ];
                         
                    const jenisPelanggaran = await modelFeed.aggregate(type_proyek);
                    console.log(jenisPelanggaran);
                  
                    //const totalLaporan = await modelProyek.find().countDocuments();
                    //console.log(`Jumlah Proyek: ${JSON.stringify(totalLaporan)}`);
                    return res.status(200).json({
                        status: true,
                        data: device,
                        message: "Testing",
                        jenis_pelanggaran: JSON.stringify(jenisPelanggaran)                                          
                                                            
                    })
           
                } else {
                    return res.status(404).json({
                        status: false,
                        message: "data not found"
                    });
                }
            }).catch(error => {
                return handle_error.db_error(res, error, 'project');
            })
    },
    closingTahun: async (req, res, next) => {
        //var search = req.query.proyek;

        await modelProyek.find()
            .sort({ proyek: -1 })
            .then(async device => {
                if (device[0]) {
                    var tnh = req.query.year;
                    var thn = parseInt(tnh,10);
                    console.log(tnh);
                    var type_proyek= [
                            { "$unwind": "$proyek_id"},
                            {
                               "$group": {
                                  "_id": {
                                     "Name": "$proyek_id",
                                     "closing": "$status",
                                     "tahun": { $year: "$time_lapor"}
                                  },
                                  "count": { "$sum": 1 }
                              }
                            },
                            {"$match": {"_id.tahun": thn,"_id.closing": true}}, 
                         ];
                         
                    const jenisPelanggaran = await modelFeed.aggregate(type_proyek);
                    console.log(jenisPelanggaran);
                  
                    //const totalLaporan = await modelProyek.find().countDocuments();
                    //console.log(`Jumlah Proyek: ${JSON.stringify(totalLaporan)}`);
                    return res.status(200).json({
                        status: true,
                        data: device,
                        message: "Testing",
                        jenis_pelanggaran: JSON.stringify(jenisPelanggaran)                                          
                                                            
                    })
           
                } else {
                    return res.status(404).json({
                        status: false,
                        message: "data not found"
                    });
                }
            }).catch(error => {
                return handle_error.db_error(res, error, 'project');
            })
    },
    closingAllTahun: async (req, res, next) => {
        //var search = req.query.proyek;

        await modelProyek.find()
            .sort({ proyek: -1 })
            .then(async device => {
                if (device[0]) {
                    
                    var type_proyek= [
                            { "$unwind": "$proyek_id"},
                            {
                               "$group": {
                                  "_id": {
                                     "Name": "$proyek_id",
                                     "closing": "$status",
                                     "year": { $year: "$time_lapor"}
                                  },
                                  "count": { "$sum": 1 }
                              }
                            },
                            {"$match": {"_id.closing": true}},
                         ];
                         
                    const jenisPelanggaran = await modelFeed.aggregate(type_proyek);
                    console.log(jenisPelanggaran);
                  
                    //const totalLaporan = await modelProyek.find().countDocuments();
                    //console.log(`Jumlah Proyek: ${JSON.stringify(totalLaporan)}`);
                    return res.status(200).json({
                        status: true,
                        data: device,
                        message: "Testing",
                        jenis_pelanggaran: JSON.stringify(jenisPelanggaran)                                          
                                                            
                    })
           
                } else {
                    return res.status(404).json({
                        status: false,
                        message: "data not found"
                    });
                }
            }).catch(error => {
                return handle_error.db_error(res, error, 'project');
            })
    },
    hallFame: async (req, res, next) => {
        //var search = req.query.proyek;

        await modelProyek.find()
            .sort({ proyek: -1 })
            .then(async device => {
                if (device[0]) {
                    
                    var type_proyek= [
                            { "$unwind": "$proyek_id"},
                            {
                               "$group": {
                                  "_id": {
                                     "Name": "$proyek_id",
                                  },
                                  "count": { "$sum": 1 }
                              }
                            },
                           
                         ];
                         
                    const jenisPelanggaran = await modelFeed.aggregate(type_proyek).sort({count: -1});
                    console.log(jenisPelanggaran);
                  
                    const totalLaporan = await modelProyek.find(type_proyek._id).countDocuments();
                    console.log(`Jumlah Proyek: ${JSON.stringify(totalLaporan)}`);
                    return res.status(200).json({
                        status: true,
                        data: device,
                        message: "Testing",
                        jenis_pelanggaran: JSON.stringify(jenisPelanggaran),                                          
                        total_laporan: JSON.stringify(totalLaporan)
                    })
           
                } else {
                    return res.status(404).json({
                        status: false,
                        message: "data not found"
                    });
                }
            }).catch(error => {
                return handle_error.db_error(res, error, 'project');
            })
    }
}



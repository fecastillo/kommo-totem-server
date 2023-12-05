const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const morgan = require("morgan");
const cors = require("cors");
const config = require("./config");
const app = express();
const axios = require("axios");
const dotenv = require("dotenv");
const reqs = [];
dotenv.config();
//variables de entorno
const uri = process.env.URL_MONGO;
const subdomain = process.env.SUBDOMAIN_KOMMO;
const dbName = process.env.NAME_DB;
const token_clickup = process.env.CLICKUP_TOKEN;
//declaro los id de los estados de kommo
const id_cotizando = 58847107;
const id_inspeccion = 60495387;
const id_diseno = 60495391;
const id_modificacion = 59410763;
const id_enviado_cliente = 58847111;
const id_enviado_comercial = 58847103;
const id_pvp_comercial = 1403188;
const id_pvp_renta_mensual = 1403190;



let variables = {
  access_token: "",
  refreshTkn: "",
};
//levanto server de mongodb
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
// Middleware
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const corsOptions = {
  origin: "*",
};

app.use(cors(corsOptions));
// Configuración
app.set("port", config.app.port);



// COTIZANDO FERNANDO CASTILLO

// KOMMOCRM: MODIFICACION  ----->  Ruta del endpoint que cambia de estado un lead en kommo con datos de clickup */




// Ruta de ejemplo
app.get("/", (req, res) => {
  res.send("¡Hola, mundo de nuevo version 26.9!");
});


//funcion nueva para registrar la relacion
async function register_relation(id_kommo, id_clickup) {
  //guardar id de kommo como numero entero
  const id_kommo_int = parseInt(id_kommo);
  console.log("register_relation2");
  await client.connect();
  const collection = client.db(dbName).collection("id_asociados_clickup_kommo");
  await collection.insertOne({
    id_clickup,
    id_kommo: id_kommo_int,
    created_at: new Date(),
  });
  await client.close();
  console.log("relation uploaded");
}

//funcion parar agrregar notas al lead en kommo
async function addNoteKommo(idKommo, note) {
  console.log("addNoteKommo");
  await getCodes();
  try {
    const token = variables.access_token;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    const url = `https://${subdomain}/api/v4/leads/${idKommo}/notes`;
    const requestBody = [
      {
      "note_type": "common",
      "params": {
        "text": note
      },
    }
  ]
    await axios.post(url, JSON.stringify(requestBody), { headers });
    console.log("Nota agregada");
  } catch (error) {
    console.error("Error al realizar la solicitud POST:", JSON.stringify(error.response.data));
  }
}
//funcion para actualizar el estado de un lead en kommo enviado a comercial
async function updateLeadKommo(idKommo,data) {
  await getCodes();
  const token = variables.access_token;
  const url = `https://${subdomain}/api/v4/leads/${idKommo}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  try {
    const response = await axios.patch(url, data, { headers });
    console.log("response: ", response.data);
  } catch (error) {
    console.error("Error al actualizar el registro en Kommo:", error);
  }
}
//funcion para mover los leads de estado en kommo
async function moveLeadKommo(idKommo, path){
  //defino el id de estado de kommo de acuerdo al path
  let idStatus = 0;
  //uso case switch para definir el id de estado de kommo de acuerdo al path
  switch (path) {
    case "cotizando":
      //ok
      idStatus = id_cotizando;
      break;
    case "inspeccion":
      //ok
      idStatus = id_inspeccion;
      break;
    case "diseno":
      //ok
      idStatus = id_diseno;
      break;
    case "modificacion":
      //ok
      idStatus = id_modificacion;
      break;
    case "enviadoCliente":
      idStatus = id_enviado_cliente;
      break;
    default:
      break;
  }
  await getCodes();
  const token = variables.access_token;
  const url = `https://${subdomain}/api/v4/leads/${idKommo}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const requestBody = 
    {
      status_id: idStatus,
      pipeline_id: 7073743
    }
  ;
  console.log("requestBody: ",requestBody);
  try {
    const response = await axios.patch(url, requestBody, { headers });
    console.log("response: ", response.data);
  } catch (error) {
    console.error("Error al actualizar el registro en Kommo:", error);
  }
}

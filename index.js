const express = require("express");
const axios = require("axios");
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
const dotenv = require("dotenv");
const cors = require("cors");
const fs = require("fs");
const { get } = require("http");
const path = require("path");
const reqs = [];
dotenv.config();
const port = process.env.PORT || 3030;
const uri = process.env.URL_MONGO;
const subdomain = process.env.SUBDOMAIN_KOMMO;
const dbName = process.env.NAME_DB;
const token_clickup = process.env.CLICKUP_TOKEN;
//declaro los id de los estados de kommo
const id_pendiente = 0;
const id_cotizando = 58847107;
const id_inspeccion = 60495387;
const id_diseno = 60495391;
const id_modificacion = 59410763;
const id_enviado_cliente = 58847111;
const id_enviado_comercial = 58847103;
const id_pvp_comercial = 1403188;
const id_pvp_renta_mensual = 1403190;
const id_vendido = 142;
const id_perdido = 143;
const id_stand_by = 66882844;
const jsonResponse = {
  data: {
    user_id: "9896011",
    domain: "borealexpedition",
    users_count: "3",
    admins: [
      {
        id: "9896011",
        name: "Boreal Expedition",
        email: "borealexpedition27072023@gmail.com",
        active: "true",
        is_admin: "Y",
        phone: "+5491164776347",
      },
    ],
    account_id: "29139821",
    tariffName: "pro",
    paid_till: "true",
    current_user: {
      id: "6509141",
      name: "Fernando",
      phone: "+5491164776347",
      email: "borealexpedition27072023@gmail.com",
    },
  },
  success: true,
  tariff: {
    is_active: true,
    expire_at: "11.08.2024",
    expire_at_human: "August 11, 2030",
    type: "pro",
    is_paid: true,
  },
  notifications: [],
};
//creo array para guardar requests
var requests = [];
// creo una ruta post para manejar una petición post con json en el body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
//funcion para obtener el token
async function getCodes() {
  await client.connect();
  const collection = client.db(dbName).collection("variables");
  const result = await collection.find().sort({ _id: -1 }).limit(1).toArray();
  variables.access_token = result[0].access_token;
  variables.refreshTkn = result[0].refresh_token;
  await client.close();
}
//funcion para renovar el token
async function postRequest() {
  //funcion para renovar el token
  const url = `https://${subdomain}/oauth2/access_token`;
  const data = {
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: variables.refreshTkn,
    redirect_uri: "https://localhost",
  };
  const headers = { "Content-Type": "application/json" };
  try {
    const response = await axios.post(url, data, { headers });
    const parsedData = response.data;
    if ("refresh_token" in parsedData) {
      await uploadCodes(parsedData.access_token, parsedData.refresh_token);
    } else {
      throw new Error("No refresh token in response");
    }
  } catch (error) {
    throw error;
  }
}
//funcion para subir el token a la base de datos
async function uploadCodes(access_token, refresh_token) {
  await client.connect();
  const collection = client.db(dbName).collection("variables");
  await collection.insertOne({
    access_token,
    refresh_token,
    created_at: new Date(),
  });
  await client.close();
}
//function para intercambiar codigo por token
async function refreshTokenFirsTime() {
  const url = `https://${subdomain}/oauth2/access_token`;
  const data = {
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: "authorization_code",
    code: process.env.CODE,
    redirect_uri: "https://localhost",
  };
  const headers = { contentType: "application/json" };
  try {
    const response = await axios.post(url, data, { headers });
    const parsedData = response.data;
    if ("refresh_token" in parsedData) {
      await uploadCodes(parsedData.access_token, parsedData.refresh_token);
    } else {
      throw new Error("No refresh token in response");
    }
  } catch (error) {
    throw error;
  }
}
//declaro objeto para almacenar los tokens
let variables = {
  access_token: process.env.LONG_LIVE_TOKEN,
};
async function processRequestSB(body) {
  console.log("Body raw: ", body);
  const settingsStr = body.data.settings.replace(/\\"/g, '"').slice(1, -1);
  const bodyParsed = JSON.parse(settingsStr);
  const bodyFields = bodyParsed.body_fields;
  const urlContinue = body.return_url.replace(".ru", ".com");

  //uso reduce para armar el json de respuesta
  const result = await bodyFields.reduce((acc, field) => {
    acc[field.left_val] = field.right_val;
    return acc;
  }, {});
  for (const key in result) {
    // Reemplaza \\n con una cadena vacía en el valor de la propiedad
    result[key] = result[key].replace(/\\n/g, "");
  }
  if (result.tipo == "crear" || result.tipo == "Crear") {
    try {
      await processNewLeadClickUp(result, urlContinue);
    } catch (error) {
      console.error(error);
    }
  } else if (result.tipo == "actualizar" || result.tipo == "Actualizar") {
    try {
      await processUpdateLeadClickUp(result, urlContinue);
    } catch (error) {
      console.log(error);
    }
  }
}

async function processRequestSBtest(body) {
  //console.log("Body raw: ", body)
  const bodyFields = body.data.settings.body_fields;
  const urlContinue = body.return_url.replace(".ru", ".com");

  //uso reduce para armar el json de respuesta
  const result = await bodyFields.reduce((acc, field) => {
    acc[field.left_val] = field.right_val;
    return acc;
  }, {});
  for (const key in result) {
    // Reemplaza \\n con una cadena vacía en el valor de la propiedad
    result[key] = result[key].replace(/\\n/g, "");
  }
  console.log(result);
  if (result.tipo == "crear" || result.tipo == "Crear") {
    try {
      await processNewLeadClickUp(result, urlContinue);
    } catch (error) {
      console.error(error);
    }
  } else if (result.tipo == "actualizar" || result.tipo == "Actualizar") {
    try {
      await processUpdateLeadClickUp(result, urlContinue);
    } catch (error) {
      console.log(error);
    }
  }
}

//funcion para procesar nuevos leads en clickup
async function processNewLeadClickUp(dataLead, urlContinue) {
  const id_task_clickup = await createTaskClickUp(dataLead);
  //await register_relation(parseInst(dataLead.id_usuario), id_task_clickup);
  let data = {
    data: {
      status: "success",
      id_clickup: id_task_clickup,
    },
  };
  await continueBot(data, urlContinue);
}
//funcion para procesar leads actualizados en clickup
async function processUpdateLeadClickUp(dataLead, urlContinue) {
  //chequear si existe el campo idClickup, si no existe buscarlo en la base de datos mediante el id de kommo
  if (!dataLead.idClickup) {
    dataLead.idClickup = await getClickupId(parseInt(dataLead.id));
  }
  //si no existe el id de clickup, no se puede continuar
  if (!dataLead.idClickup) {
    console.error("No se encontró el ID de ClickUp.");
    return;
  }
  //actualizar tares en clickup
  await updateTaskClickUp(dataLead, urlContinue);
}
//funcion para continuar el bot
async function continueBot(data, urlContinue) {
  const url = urlContinue;
  const token = variables.access_token;
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  try {
    const response = await axios.post(url, data, config);
  } catch (error) {
    console.error(error);
  }
}
//funcion para obtener el id de lista de clickup en base al id de usuario
async function getIdListaClickup(id_usuario) {
  var id_lista_clickup = 0;
  //defino id de lista de acuero al usuario
  if (
    parseInt(id_usuario) === 9830207 ||
    parseInt(id_usuario) === 9267207 ||
    parseInt(id_usuario) === 9913875
  ) {
    //proyectos
    id_lista_clickup = 386779373;
    return id_lista_clickup;
  } else if (
    parseInt(id_usuario) === 10085503 ||
    parseInt(id_usuario) === 10110987
  ) {
    //quitotem
    id_lista_clickup = 900800948233;
    return id_lista_clickup;
  } else if (parseInt(id_usuario) === 10132156) {
    //combustibles
    id_lista_clickup = 900801002128;
  }
  return id_lista_clickup;
}
//funcion para obtener el status de clickup en base al statusid de kommo
async function getStatusClickup(statusId) {
  //usar switch para definir el status de clickup en base al statusId de kommo
  var statusClickup = "";
  switch (statusId) {
    case id_cotizando:
      statusClickup = "Cotizando";
      break;
    case id_inspeccion:
      statusClickup = "Inspección";
      break;
    case id_diseno:
      statusClickup = "Diseño";
      break;
    case id_modificacion:
      statusClickup = "Modificación";
      break;
    case id_enviado_cliente:
      statusClickup = "Por aprobar cliente";
      break;
    case id_enviado_comercial:
      statusClickup = "Enviada a comercial";
      break;
    case id_vendido:
      statusClickup = "Aprobada";
      break;
    case id_perdido:
      statusClickup = "Perdidas";
      break;
    case id_stand_by:
      statusClickup = "STAND BY";
    default:
      statusClickup = "Pendiente";
  }
  return statusClickup;
}
//funcion para obtener el id status de kommo en base al status de clickup
async function getStatusIdKommo(statusClickup) {
  let statusIdKommo = 0;
  switch (statusClickup) {
    case "Pendiente":
      statusIdKommo = id_pendiente;
      break;
    case "Cotizando":
      statusIdKommo = id_cotizando;
      break;
    case "Inspección":
      statusIdKommo = id_inspeccion;
      break;
    case "Diseño":
      statusIdKommo = id_diseno;
      break;
    case "Modificación":
      statusIdKommo = id_modificacion;
      break;
    case "Por aprobar cliente":
      statusIdKommo = id_enviado_cliente;
      break;
    case "Enviada a comercial":
      statusIdKommo = id_enviado_comercial;
      break;
    case "Aprobada":
      statusIdKommo = id_vendido;
      break;
    case "Perdidas":
      statusIdKommo = id_perdido;
      break;
    case "APROBADA":
      statusIdKommo = id_vendido;
      break;
    case "PERDIDAS":
      statusIdKommo = id_perdido;
      break;
    case "STAND BY":
      statusIdKommo = id_stand_by;
      break;
    case "Stand by":
      statusIdKommo = id_stand_by;
      break;
    default:
      statusIdKommo = id_vendido;
  }
  return statusIdKommo;
}
//funcion para obtener el nombre de usuario de kommo en base al id
async function getNameUserKommo(id_usuario) {
  var nameUserKommo = "";
  switch (parseInt(id_usuario)) {
    case 9267207:
      nameUserKommo = "Soledad Mancheno";
      break;
    case 9830207:
      nameUserKommo = "Luis Fernando Uribe";
      break;
    case 10085503:
      nameUserKommo = "Alejandro Sandoval";
      break;
    case 10110987:
      nameUserKommo = "Carlos Francisco Teran";
      break;
    case 10132156:
      nameUserKommo = "Santiago Guzman";
      break;
    case 9913875:
      nameUserKommo = "Lenny Rojas";
    default:
      nameUserKommo = "No definido";
  }
  return nameUserKommo;
}
//funcion para obtener los campos custom de clickup
async function getCustomFieldsClickUp(id_lista_clickup) {
  const url = `https://api.clickup.com/api/v2/list/${id_lista_clickup}/field`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: token_clickup,
  };
  try {
    const response = await axios.get(url, {
      headers: headers,
    });
  } catch (error) {
    console.error("Error al realizar la solicitud GET:", error);
  }
}
//funcion para obtener un task de clickup mediante el id
async function getTaskClickUp(id_task_clickup, customFieldName) {
  const dataResponse = {
    customFieldValue: 0,
    error: "",
  };
  const url = `https://api.clickup.com/api/v2/task/${id_task_clickup}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: token_clickup,
  };
  try {
    const response = await axios.get(url, { headers: headers });
    const customFields = response.data.custom_fields;
    const customFieldValue = await getCustomFieldClickUp(
      customFieldName,
      customFields
    );
    dataResponse.customFieldValue = customFieldValue;
    return dataResponse;
  } catch (error) {
    if (error.response.data.ECODE == "ITEM_013") {
      dataResponse.error = "Tarea borrada en clickup";
      return dataResponse;
    } else if (error.response.data.ECODE == "OAUTH_027") {
      dataResponse.error = "Tarea no autorizada en clickup";
      return dataResponse;
    }
    console.error("Error al realizar la solicitud GET:", error.response.data);
  }
}
//funcion para buscar el custom field de clickup en base al nombre y retornar el valor, recibe el nombre del campo y el array de custom fields
async function getCustomFieldClickUp(name, customFields) {
  var value = 0;
  customFields.forEach(async function (item) {
    if (item.name == name) {
      //chequear si existe el campo "value", si no existe devolver false
      if (item.value) {
        value = item.value;
      }
    }
  });
  return value;
}

//funcion para obteener el uid de tipo de acuerdo al valor
function getUidTipo(value) {
  const options = [
    {
      id: "30c97e83-7549-432c-b3e2-32894de7ded0",
      name: "Venta",
      color: null,
      orderindex: 0,
    },
    {
      id: "6b17587b-be96-4951-9198-beb6e6c1696f",
      name: "Renta",
      color: null,
      orderindex: 1,
    },
  ];
  const option = options.find((option) => option.name === value);
  if (option) {
    return option.id;
  }
  return null;
}

//funcion para crear tarea en clickup
async function createTaskClickUp(data) {
  const idDataLead = await getLeadKommo(data.id);
  console.log(idDataLead);
  var dataCustomFields = [
    {
      id: "27317d59-217e-4bac-9b5c-b62c1bb9d8ae",
      name: "GTT",
      value: data.gtt || "",
    },

    {
      id: "524d6c56-f6ad-422b-8bcb-f5d150b6a588",
      name: "PVP comercial",
      value: data.pvpComercial || 0,
    },

    {
      id: "f3c4fd75-cbb2-4218-92ec-f13236ffdcf6",
      name: "RENTA MENSUAL",
      value: data.pvpRentaMensual || 0,
    },

    {
      id: "25dcdffe-eb04-450e-836d-d45c6f02d597",
      name: "Id Kommo",
      value: data.id || "",
    },

    {
      id: "f85c1750-6844-428e-860d-27bd5b8c6773",
      name: "Fecha de creacion en Kommo",
      value: idDataLead.created_at,
      value_options: { time: true },
    },

    {
      id: "21433403-f259-4794-9a74-dc8e3aea6469",
      name: "Usuario creador Kommo",
      value: await getNameUserKommo(parseInt(data.id_usuario)),
    },

    {
      id: "2e8a5b02-75e6-48b2-be77-1a7992d7ff29",
      name: "Estado kommo",
      value: await getStatusClickup(parseInt(data.status)),
    },
    {
      id: "65aeec73-23bc-4153-9f59-8cd285fac859",
      name: "LINEA DE NEGOCIO",
      value: data.linea_negocio,
    },
    {
      id: "cb6757e9-6cae-4a7e-97ae-ed9d8ee6331e",
      name: "Tipo",
      value: data.tipo_venta ? getUidTipo(data.tipo_venta) : null,
    },
  ];
  //recorrer dataCustomFields, si hay campos values con valor 0 o vario elminar todo el objeto al que pertenece
  dataCustomFields.forEach(function (item, index, object) {
    if (
      item.value == 0 ||
      item.value == "" ||
      item.value == null ||
      item.value == ""
    ) {
      object.splice(index, 1);
    }
  });
  var id_lista_clickup = await getIdListaClickup(parseInt(data.id_usuario));
  const url = `https://api.clickup.com/api/v2/list/${id_lista_clickup}/task`;
  const body = {
    name: data.taskName,
    start_date: idDataLead.created_at,
    //buscar id de estado de clickup en base al id de estado de kommo
    status: await getStatusClickup(parseInt(data.status)),
    description:
    new Date().toLocaleDateString() + "Tarea creada desde Kommo, fecha: " ,
    //definir custom fieds solo si hay datos en el array

    custom_fields: dataCustomFields.length > 0 ? dataCustomFields : null,
  };
  const headers = {
    "Content-Type": "application/json",
    Authorization: token_clickup,
  };
  try {
    const response = await axios.post(url, JSON.stringify(body), {
      headers: headers,
    });
    console.log("Tarea creada: ", data.id);
    return response.data.id;
  } catch (error) {
    console.error("Error al realizar la solicitud POST:", error.response.data);
  }
}
//funcion para actualizar las tareas en clickup
async function updateTaskClickUp(data, urlContinue) {
  var updatedGtt = 0;
  const dataCustomFields = [
    {
      id: "524d6c56-f6ad-422b-8bcb-f5d150b6a588",
      name: "PVP comercial",
      value: parseInt(data.pvpComercial) || 0,
    },
    {
      id: "f3c4fd75-cbb2-4218-92ec-f13236ffdcf6",
      name: "RENTA MENSUAL",
      value: parseInt(data.pvpRentaMensual) || 0,
    },
    {
      id: "25dcdffe-eb04-450e-836d-d45c6f02d597",
      name: "Id Kommo",
      value: data.id || "",
    },
    {
      id: "2e8a5b02-75e6-48b2-be77-1a7992d7ff29",
      name: "Estado kommo",
      value: await getStatusClickup(parseInt(data.status)),
    },
    {
      id: "65aeec73-23bc-4153-9f59-8cd285fac859",
      name: "LINEA DE NEGOCIO",
      value: data.linea_negocio,
    },
    {
      id: "cb6757e9-6cae-4a7e-97ae-ed9d8ee6331e",
      name: "Tipo",
      value: data.tipo_venta ? getUidTipo(data.tipo_venta) : null,
    },
  ];
  if (data.status == id_enviado_comercial) {
    var lastGtt = await getLastGtt();
    updatedGtt = lastGtt + 1;
    dataCustomFields.push({
      id: "f85c1750-6844-428e-860d-27bd5b8c6773",
      name: "Fecha de envio a comercial",
      value: Date.now(),
      value_options: { time: true },
    });
    dataCustomFields.push({
      id: "27317d59-217e-4bac-9b5c-b62c1bb9d8ae",
      name: "GTT",
      //el value de gtt se compone por el numero de año actual 23 + el ultimo gtt subido a mongo, ejemplo -1000
      value: `GTT24-${updatedGtt}`,
    });
    await postLastGtt(updatedGtt);
  } else if (data.status == id_enviado_cliente) {
    dataCustomFields.push({
      id: "3fdba457-a671-47d8-8e7c-679c51e118bf",
      name: "Fecha envio cotizacion",
      value: Date.now(),
      value_options: { time: true },
    });
  }
  const url = `https://api.clickup.com/api/v2/task/${data.idClickup}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: token_clickup,
  };
  const body = {
    description: `Tarea actualizada desde Kommo, fecha: ${new Date().toLocaleDateString()}`,
    status: await getStatusClickup(parseInt(data.status)),
  };

  try {
    const response = await axios.put(url, body, {
      headers,
    });
    // Actualiza los campos personalizados no vacíos
    for (const field of dataCustomFields) {
      if (field.value !== "" && field.value !== null) {
        const fieldUrl = `https://api.clickup.com/api/v2/task/${data.idClickup}/field/${field.id}`;
        const fieldBody = {
          value: field.value,
        };

        await axios.post(fieldUrl, fieldBody, {
          headers,
        });
      }
    }
    //continuar bot
    if (data.status == id_enviado_comercial) {
      await continueBot(
        { data: { status: "success", gtt: `GTT24-${updatedGtt}` } },
        urlContinue
      );
    } else if (data.status == id_enviado_cliente) {
      await continueBot(
        { data: { status: "success", fecha: Date.now() } },
        urlContinue
      );
    } else {
      await continueBot({ data: { status: "success" } }, urlContinue);
    }
  } catch (error) {
    console.log("Error al realizar la solicitud PUT:", error);
  }
}
//funcion para actualizar los campos custom de clickup, sin mover de estado
async function updateCustomFieldsClickUp(data) {
  const dataCustomFields = [
    {
      id: "524d6c56-f6ad-422b-8bcb-f5d150b6a588",
      name: "PVP comercial",
      value: parseInt(data.pvpComercial) || 0,
    },
    {
      id: "f3c4fd75-cbb2-4218-92ec-f13236ffdcf6",
      name: "RENTA MENSUAL",
      value: parseInt(data.pvpRentaMensual) || 0,
    },
  ];
  const url = `https://api.clickup.com/api/v2/task/${data.idClickUp}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: token_clickup,
  };
  try {
    const response = await axios.put(url, data, {
      headers,
    });
    // Actualiza los campos personalizados no vacíos
    for (const field of dataCustomFields) {
      if (field.value !== "" && field.value !== null) {
        const fieldUrl = `https://api.clickup.com/api/v2/task/${data.idClickUp}/field/${field.id}`;
        const fieldBody = {
          value: field.value,
        };
        const response = await axios.post(fieldUrl, fieldBody, {
          headers,
        });
      }
    }
  } catch (error) {
    console.log("Error al realizar la solicitud PUT:", error);
  }
}
//funcion para actualizar el campo pvp Comercial en kommo
async function updatePvpComercialKommo(idKommo, pvpComercial, idClickUp) {
  //si el id de kommo es 0 o es NaN, buscarlo en la base de datos mediante el id de clickup
  if (!idKommo || idKommo == 0 || isNaN(idKommo)) {
    idKommo = await getKommoId(idClickUp);
  }
  const url = `https://${subdomain}/api/v4/leads/${idKommo}`;
  const token = variables.access_token;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const requestBody = {
    price: parseInt(pvpComercial),
    custom_fields_values: [
      {
        field_id: id_pvp_comercial,
        field_name: "PVP Comercial",
        values: [
          {
            value: pvpComercial,
          },
        ],
      },
      {
        field_id: 1403964,
        field_name: "Ultima actualizacion",
        values: [
          {
            //el value debe ser en unix timestamp, debe incluir hora, minuto y segundo
            value: Math.floor(Date.now() / 1000),
          },
        ],
      },
    ],
    updated_by: 0,
    updated_at: Math.floor(Date.now() / 1000),
  };
  try {
    const response = await axios.patch(url, requestBody, { headers });
  } catch (error) {
    throw error;
  }
}
//funcion para actualizar el campo renta mensual en kommo
async function updatePvpRentaMensualKommo(idKommo, pvpRentaMensual, idClickUp) {
  //si el id de kommo es 0 o es NaN, buscarlo en la base de datos mediante el id de clickup
  if (!idKommo || idKommo == 0 || isNaN(idKommo)) {
    idKommo = await getKommoId(idClickUp);
  }
  const url = `https://${subdomain}/api/v4/leads/${idKommo}`;
  const token = variables.access_token;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  const requestBody = {
    custom_fields_values: [
      {
        field_id: id_pvp_renta_mensual,
        field_name: "PVP Renta Mensual",
        values: [
          {
            value: pvpRentaMensual,
          },
        ],
      },
      {
        field_id: 1403964,
        field_name: "Ultima actualizacion",
        values: [
          {
            value: Math.floor(Date.now() / 1000),
          },
        ],
      },
    ],
    updated_by: 0,
    updated_at: Math.floor(Date.now() / 1000),
  };
  try {
    const response = await axios.patch(url, requestBody, { headers });
  } catch (error) {
    throw error;
  }
}
//funcion para obtener el id de clickup en base a kommo
async function getClickupId(idKommo) {
  await client.connect();
  const collection = await client
    .db(dbName)
    .collection("id_asociados_clickup_kommo");
  const result = await collection.find({ id_kommo: idKommo }).toArray();
  if (result.length > 0) {
    await client.close();
    return result[0].id_clickup;
  } else {
    console.error("No se encontró un registro asociado a ese ID de ClickUp.");
    await client.close();
    return false;
  }
  await client.close();
}
//funcion para obtener el id de kommo en base a clickup
async function getKommoId(idClickUp) {
  await client.connect();
  const collection = client.db(dbName).collection("id_asociados_clickup_kommo");
  const result = await collection.find({ id_clickup: idClickUp }).toArray();
  if (result.length > 0) {
    await client.close();
    return result[0].id_kommo;
  } else {
    console.error("No se encontró un registro asociado a ese ID de ClickUp.");
    await client.close();
    return false;
  }
}
//funcion para obtener el ultimo valor gtt creado en mongo, en la collection gtt
async function getLastGtt() {
  await client.connect();
  const collection = client.db(dbName).collection("gtt");
  const result = await collection.find().sort({ _id: -1 }).limit(1).toArray();
  if (result.length > 0) {
    await client.close();
    return result[0].gtt;
  } else {
    console.error("No se encontró un registro asociado a ese ID de ClickUp.");
    await client.close();
    return false;
  }
}
//funcion para subir el gtt a mongo
async function postLastGtt(gtt) {
  await client.connect();
  const collection = client.db(dbName).collection("gtt");
  await collection.insertOne({
    gtt,
    created_at: new Date(),
  });
  await client.close();
}
//funcion para procesar el webhook de kommo
async function processRequestKommo(body) {
  const estadoActualKommo = body.payload.custom_fields.find(
    (item) => item.name === "Estado Kommo"
  ).value;
  const idClickUp = body.payload.id;
  const statusClickUp =
    body.payload.status.status.charAt(0).toUpperCase() +
    body.payload.status.status.slice(1);
  const idStatusKommo = await getStatusIdKommo(statusClickUp);
  //idkommo, buscar en el array body.payload.custom_fields el elemento que cpincida con name: "Id Kommo" y asignarle el valor de value a idKommo, si existe convertir a numero integral
  var idKommo = parseInt(
    body.payload.custom_fields.find((item) => item.name === "Id kommo").value
  );
  //si no existe el id de kommoo o es 0 o es NaN, buscarlo en la base de datos mediante el id de clickup
  if (!idKommo || idKommo == 0 || isNaN(idKommo)) {
    idKommo = await getKommoId(idClickUp);
  }
  //si no existe el id de kommo, no se puede continuar
  if (!idKommo) {
    console.error("No se encontró el ID de Kommo.");
    return;
  }
  if (idStatusKommo != id_enviado_comercial) {
    try {
      const requestBody = {
        status_id: idStatusKommo,
        pipeline_id: 7073743,
      };
      await updateLeadKommo(idKommo, requestBody);
    } catch (error) {
      console.log(error);
    }
  } else if (
    statusClickUp == "Por aprobar cliente" &&
    estadoActualKommo == "Enviada a comercial"
  ) {
    return;
  } else {
    try {
      let pvp_comercial =
        parseInt(
          body.payload.custom_fields.find(
            (item) => item.name === "PVP comercial"
          ).value
        ) || 0;
      let pvp_renta_mensual =
        parseInt(
          body.payload.custom_fields.find(
            (item) => item.name === "RENTA MENSUAL"
          ).value
        ) || 0;
      const requestBody = {
        custom_fields_values: [
          {
            field_id: id_pvp_renta_mensual,
            field_name: "PVP Renta Mensual",
            values: [
              {
                value: pvp_renta_mensual,
              },
            ],
          },
          {
            field_id: id_pvp_comercial,
            field_name: "PVP Comercial",
            values: [
              {
                value: pvp_comercial,
              },
            ],
          },
        ],
        status_id: idStatusKommo,
        pipeline_id: 7073743,
        updated_by: 0,
        updated_at: Math.floor(Date.now() / 1000),
      };
      await updateLeadKommo(idKommo, requestBody);
    } catch (error) {
      console.log(error);
    }
  }
  //actualizar el lead en kommo
}
//funcion para actualizar el lead en kommo
async function updateLeadKommo(idKommo, data) {
  const url = `https://${subdomain}/api/v4/leads/${idKommo}`;
  const token = variables.access_token;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  try {
    await axios.patch(url, data, { headers });
  } catch (error) {
    console.error(error);
  }
}
// Función asincrónica para obtener la fecha de última actualización
const obtenerUltimaActualizacion = async (leadsData) => {
  let ultimaActualizacion = 0;
  try {
    ultimaActualizacion = leadsData.update[0].custom_fields.find(
      (element) => element.id == 1403964
    ).values[0];
  } catch (error) {
    ultimaActualizacion = 0;
  }
  return ultimaActualizacion;
};
// Función asincrónica para manejar la lógica de actualización
const manejarActualizacion = async (ultimaActualizacion, leadsData, res) => {
  let pvpComercial = null;
  let pvpRentaMensual = null;
  let idClickUp = null;
  let idKommo = leadsData.update[0].id;
  let data = {};
  data.idKommo = idKommo;
  if (ultimaActualizacion === 0) {
    res.sendStatus(200);
    return;
  } else if (Math.floor(Date.now() / 1000) - ultimaActualizacion < 300) {
    res.sendStatus(200);
    return;
  } else {
    try {
      pvpComercial = leadsData.update[0].custom_fields.find(
        (element) => element.id == 1403188
      ).values[0].value;
      data.pvpComercial = pvpComercial;
    } catch (error) {
      pvpComercial = null;
    }
    try {
      pvpRentaMensual = leadsData.update[0].custom_fields.find(
        (element) => element.id == 1403190
      ).values[0].value;
      data.pvpRentaMensual = pvpRentaMensual;
    } catch (error) {
      pvpRentaMensual = null;
    }
    try {
      idClickUp = leadsData.update[0].custom_fields.find(
        (element) => element.id == 1403962
      ).values[0].value;
      data.idClickUp = idClickUp;
    } catch (error) {
      //se debe buscar el id de clickup en la base de datos
      idClickUp = await getClickupId(idKommo);
      data.idClickUp = idClickUp;
    }
    // Operaciones asincrónicas de actualización podrían realizarse aquí
    await updateCustomFieldsClickUp(data);
    res.sendStatus(200);
  }
};
//funcion para obtener todos los leads de kommo con parametro de pagina
async function getAllLeadsKommo(page) {
  const url = `https://${subdomain}/api/v4/leads?page=${page}&limit=250&filter[statuses][0][pipeline_id]=7073743&filter[statuses][0][status_id]=58847099&filter[statuses][1][pipeline_id]=7073743&filter[statuses][1][status_id]=60495387&filter[statuses][2][pipeline_id]=7073743&filter[statuses][2][status_id]=58847107&filter[statuses][3][pipeline_id]=7073743&filter[statuses][3][status_id]=59410763&filter[statuses][4][pipeline_id]=7073743&filter[statuses][4][status_id]=60495391&filter[statuses][5][pipeline_id]=7073743&filter[statuses][5][status_id]=58847103&filter[statuses][6][pipeline_id]=7073743&filter[statuses][6][status_id]=58847111`;
  const token = variables.access_token;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.log(error);
  }
}
//funcion para obtener todos los leads de kommo, es una funcion recursiva si existe next en "_links" de la respuesta
async function getAllLeadsKommoRecursive() {
  let page = 1;
  const data = await getAllLeadsKommo(page);
  if (data._links.next) {
    const nextData = await getAllLeadsKommoRecursive(page + 1);
    return data._embedded.leads.concat(nextData);
  } else {
    return data._embedded.leads;
  }
}
//funcion paara simplicar el array y convertirlo en un objeto
function arrayToJson(lead, campo) {
  function findField(fieldName) {
    return lead.custom_fields_values.find(
      (item) => item.field_name === fieldName
    );
  }

  var result = {
    id: lead.id,
    status_id: lead.status_id,
    pipeline_id: lead.pipeline_id,
  };

  var campoItem = findField(campo);
  var valorCampo =
    campoItem && campoItem.values && campoItem.values.length > 0
      ? campoItem.values[0].value
      : null;
  if (valorCampo == 0 || valorCampo == "" || valorCampo == null) {
    result[campo] = 0;
    //result[campoItem.field_name] = campoItem.values[0].value;

    var idClickupItem = findField("Id clickup");
    if (
      idClickupItem &&
      idClickupItem.values &&
      idClickupItem.values.length > 0
    ) {
      result[idClickupItem.field_name] = idClickupItem.values[0].value;
      return result;
    }
  }
}

async function getAllPvpComercial() {
  const data = await getAllLeadsKommoRecursive();
  var result = [];
  for (var i = 0; i < data.length; i++) {
    var item = data[i];
    const leadsPvpRentaMensual = arrayToJson(item, "PVP Comercial");
    if (leadsPvpRentaMensual) {
      result.push(leadsPvpRentaMensual);
    }
  }
  //recorrer el array de leads y pasar como parametro de la funcion getTaskClickUp el id de clickup
  for (var i = 0; i < result.length; i++) {
    var item = result[i];

    const pvpComercialClickupData = await getTaskClickUp(
      item["Id clickup"],
      "PVP comercial"
    );
    const pvpComercialClickup = pvpComercialClickupData.customFieldValue;
    item["Pvp comercial clickup"] = pvpComercialClickup;

    if (pvpComercialClickup != item["PVP Comercial"]) {
      item["Actualizar en kommo"] = true;
      try {
        await updatePvpComercialKommo(
          item.id,
          pvpComercialClickup,
          item["Id clickup"]
        );
        //insertar hora de actualizacion en formato humano
        item["Hora actualizacion"] = new Date().toLocaleTimeString();
      } catch (error) {
        console.log(error);
      }
    } else {
      item["Actualizar en kommo"] = false;
      //si existe el campo pvpComercialClickup.error reflear ese campo en el item
      if (pvpComercialClickupData.error) {
        item["Detalles error"] = pvpComercialClickupData.error;
      }
    }
  }
  return result;
}
async function getAllPvpRentaMensual() {
  const data = await getAllLeadsKommoRecursive();
  var result = [];
  for (var i = 0; i < data.length; i++) {
    var item = data[i];
    const leadsPvpRentaMensual = arrayToJson(item, "PVP Renta Mensual");
    if (leadsPvpRentaMensual) {
      result.push(leadsPvpRentaMensual);
    }
  }
  //recorrer el array de leads y pasar como parametro de la funcion getTaskClickUp el id de clickup
  for (var i = 0; i < result.length; i++) {
    var item = result[i];

    const rentaMensualClickupData = await getTaskClickUp(
      item["Id clickup"],
      "RENTA MENSUAL"
    );
    const rentaMensualClickup = rentaMensualClickupData.customFieldValue;
    item["Renta mensual clickup"] = rentaMensualClickup;

    if (rentaMensualClickup != item["PVP Renta Mensual"]) {
      item["Actualizar en kommo"] = true;
      try {
        await updatePvpRentaMensualKommo(
          item.id,
          rentaMensualClickup,
          item["Id clickup"]
        );
        //insertar hora de actualizacion en formato humano
        item["Hora actualizacion"] = new Date().toLocaleTimeString();
      } catch (error) {
        console.log(error);
      }
    } else {
      item["Actualizar en kommo"] = false;

      if (rentaMensualClickupData.error) {
        item["Detalles error"] = rentaMensualClickupData.error;
      }
    }
  }
  return result;
}
//funcion para obtener lead by id
async function getLeadKommo(id) {
  const url = `https://${subdomain}/api/v4/leads/${id}`;
  const token = variables.access_token;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.log(error);
  }
}
//funcion para actualizar campo nota en clickup

async function addNotaClickup(data) {
  //console.log(data.leads.note[0].note.element_id)
  const dataLead = await getLeadKommo(
    parseInt(data.leads.note[0].note.element_id)
  );
  if (!dataLead) {
    return;
  }
  //buscar el id de clickup en el array de custom fields
  const idClickUp =
    dataLead.custom_fields_values.find((item) => item.field_id === 1403962)
      .values[0].value || false;
  if (!idClickUp) {
    return;
  }
  const url = `https://api.clickup.com/api/v2/task/${idClickUp}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: token_clickup,
  };
  let body = {
    description:"",
  };
  try {
    const dataClickup = await getTaskClickUp2(idClickUp);
    const nuevoTexto  = agregarTextoConFecha(dataClickup.description, data.leads.note[0].note.text);
    console.log("Nuevo texto: ", nuevoTexto);
    //const nuevoTexto = agregarTextoConFecha(dataClickup.description, "Texto de pruebas");
    body.description = nuevoTexto;
    //console.log(nuevoTexto);
    const response = await axios.put(url, JSON.stringify(body), { headers });
    console.log(response.data);
  } catch (error) {
    console.log("Error al realizar la solicitud PUT:", error);
  }
}

//funcion para obtener task by id de clickup
async function getTaskClickUp2(id) {
  const url = `https://api.clickup.com/api/v2/task/${id}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: token_clickup,
  };
  try {
    const response = await axios.get(url, { headers });
    return response.data
  } catch (error) {
    return { error: error.response.data };
  }
}
//funcion para modificar la descripcion
function agregarTextoConFecha(texto_viejo, nuevo_texto) {
  // Obtén la fecha actual
  const fechaActual = new Date();
  const dia = fechaActual.getDate();
  const mes = fechaActual.getMonth() + 1; // Los meses en JavaScript van de 0 a 11
  const anio = fechaActual.getFullYear();

  // Formatea la fecha como DD/MM/YYYY
  const fechaFormateada = `${dia.toString().padStart(2, "0")}/${mes
    .toString()
    .padStart(2, "0")}/${anio}`;

  // Combina el texto viejo con el nuevo texto y la fecha
  const textoActualizado = `${texto_viejo}\n${fechaFormateada}: ${nuevo_texto}`;

  return textoActualizado;
}

//getTaskClickUp("86b0eedh5");
async function run() {}
//run()
//creo ruta para ver requests
app.get("/requests", (req, res) => {
  res.json(requests);
});
//endpoint filtrando el user agent
app.post(
  "/api/widget/efece_send_webhook/salesbot_request",
  async (req, res) => {
    if (req.headers["user-agent"] === "amoCRM-Webhooks/3.0") {
      await processRequestSB(req.body);
      res.sendStatus(200);
    } else {
      res.sendStatus(200);
    }
  }
);

//endpoint filtrando el user agent
app.post("/test", async (req, res) => {
  await processRequestSBtest(req.body);
  res.sendStatus(200);
});

// creo ruta para /api/account
app.post("/api/account", (req, res) => {
  res.json(jsonResponse);
});
//creo ruta para /api/onsave
app.post("/api/onsave", (req, res) => {
  res.json(jsonResponse);
});
//creo ruta para /api/onsave/efece_send_webhook
app.post("/api/onsave/efece_send_webhook", (req, res) => {
  res.json(jsonResponse);
});
//creo ruta para /api/account/efece_send_webhook
app.post("/api/account/efece_send_webhook", (req, res) => {
  res.json(jsonResponse);
});
//ruta para procesar el webhook de kommo
app.post("/api/webhook", async (req, res) => {
  await processRequestKommo(req.body);
  res.sendStatus(200);
});
//ruta para procesar el cambio del campo pvp comercial en kommo /pvpComercial?idKommo=10635172
app.post("/pvpComercial", async (req, res) => {
  const idClickUp = req.body.payload.id;
  const idKommo = req.query.idKommo || 0;
  const pvpComercial = req.query.pvpComercial;
  let pvpNumber = 0;
  //si existe pvpComercial, extraer el numero y eliminar el signo de dolar
  if (pvpComercial) {
    pvpNumber = pvpComercial.replace(/\D/g, "");
  }
  try {
    await updatePvpComercialKommo(idKommo, pvpNumber, idClickUp);
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(500);
  }
});
//ruta para procesar el cambio del campo renta mensual en kommo /rentaMensual?idKommo=10635172&rentaMensual=USD%202000
app.post("/rentaMensual", async (req, res) => {
  const idClickUp = req.body.payload.id;
  const idKommo = req.query.idKommo || 0;
  const pvpRentaMensual = req.query.rentaMensual;
  let pvpNumber = 0;
  //si existe pvpRentaMensual, extraer el numero y eliminar el signo de dolar
  if (pvpRentaMensual) {
    pvpNumber = pvpRentaMensual.replace(/\D/g, "");
  }
  try {
    await updatePvpRentaMensualKommo(idKommo, pvpNumber, idClickUp);
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});
// Ruta actualizada con las funciones asincrónicas
app.post("/updateFields", async (req, res) => {
  if (req.headers["user-agent"] === "amoCRM-Webhooks/3.0") {
    try {
      const ultimaActualizacion = await obtenerUltimaActualizacion(
        req.body.leads
      );
      await manejarActualizacion(ultimaActualizacion, req.body.leads, res);
    } catch (error) {
      console.error("Error:", error);
      res.status(500).send("Error en el servidor");
    }
  } else {
    res.sendStatus(200);
  }
});
//ruta para procesar los cambios de campo en kommo y reflejarlos en clicku
//ruta para refrescar el token
app.post("/token", async (req, res) => {
  try {
    await getCodes();
    await postRequest();
    res.json({ exitoso: true });
  } catch (err) {
    res.sendStatus(500).json({ error: err.message });
  }
});
//ruta para actualizar el campo pvp comercial en kommo
app.get("/actualizarPvpComercial", async (req, res) => {
  try {
    const data = await getAllPvpComercial();
    res.json(data);
  } catch (error) {
    res.sendStatus(500);
  }
});
//ruta para actualziar renta mensual
app.get("/actualizarRentaMensual", async (req, res) => {
  try {
    const data = await getAllPvpRentaMensual();
    res.json(data);
  } catch (error) {
    res.sendStatus(500);
  }
});
//ruta para recibir notas y enviar notas a clickup
app.post("/updateNote", async (req, res) => {
  //console.log(req.body);
  try {
    await addNotaClickup(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});
//entregar archivo index.html
app.get("/index", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
// levanto el servidor en el puerto 300
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

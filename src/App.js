/* Copyright (c) 2020 vonKrafft <contact@vonkrafft.fr>
 * 
 * This file is part of VulnDB.
 * 
 * This file may be used under the terms of the GNU General Public License
 * version 3.0 as published by the Free Software Foundation and appearing in
 * the file LICENSE included in the packaging of this file. Please review the
 * following information to ensure the GNU General Public License version 3.0
 * requirements will be met: http://www.gnu.org/copyleft/gpl.html.
 * 
 * This file is provided AS IS with NO WARRANTY OF ANY KIND, INCLUDING THE
 * WARRANTY OF DESIGN, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
 */

import React from 'react';
import { Link, Route, Redirect } from "react-router-dom";
import { Container, Message, Menu, Header, Grid, Icon, Loader, Input, 
  Ref, List, Dropdown, Dimmer, Button, Popup, Label, Sticky, Segment, Modal, 
  Table, Form } from 'semantic-ui-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

import unified from 'unified'
import remarkParse from 'remark-parse'
import remarkAbbr from 'remark-abbr'
import remarkKbd from 'remark-kbd'
import remarkReact from 'remark-react'

import './App.css';
import _ from 'lodash';

export default function App() {
  const renderTplHomePage = (props) => ( <TplHomePage {...props} /> );
  return (
    <React.Fragment>
      <Route path="/" exact render={() => <Redirect to="/home/FR//" />} />
      <Route path="/home/:lang/:search?/:uuid?" render={renderTplHomePage} />
    </React.Fragment>
  );
}

/*****************************************************************************
 * TplHomePage
 *****************************************************************************/

class TplHomePage extends React.Component {
  state = {}

  constructor(props) {
    const { lang, uuid, search } = props.match.params;
    super(props);
    this.state = {
      loading: true,
      lang: lang || 'FR',
      uuid: uuid || null,
      search: decodeURIComponent(search || ''),
      data: [],
      total: 0,
      refs: [],
      templates: []
    };
    this.containerRef = React.createRef();
  }

  componentDidMount = () => {
    fetch('/api/templates')
      .then(response => { 
        if (response.status < 400) return response.json(); 
        else throw new Error(); 
      })
      .then(result => {
        const { lang, search, uuid } = this.state;
        this.setState({ 
          loading: false, 
          data: result.data, 
          total: result.data.length, 
          refs: _.reduce(result.data, (refs, tpl) => {
            refs[tpl.uuid] = React.createRef();
            return refs;
          }, {}),
          templates: this.filter(result.data, lang, search, uuid) 
        });
      })
      .catch(error => this.setState({ 
        loading: false, 
        error 
      }));
  }

  componentDidUpdate = () => {
    const { refs, uuid } = this.state;
    if (uuid !== null) {
      window.scrollTo({
        top: refs[uuid].current.offsetTop - 14,
        behavior: 'smooth'
      });
      this.setState({ uuid: null });
    }
  }

  handleUpdate = (tpl) => {
    const { data } = this.state;
    const newData = _.uniqBy([tpl, ...data], 'uuid');
    this.setState({ 
      loading: false, 
      data: newData, 
      total: newData.length, 
      refs: _.reduce(newData, (refs, tpl) => {
        refs[tpl.uuid] = React.createRef();
        return refs;
      }, {}),
      uuid: tpl.uuid,
      templates: this.filter(newData, tpl.language, '') 
    });
    this.props.history.push(`/home/${tpl.language}//${tpl.uuid}`);
  }

  filter = (data, lang, search) => {
    return _.sortBy(_.filter(data, (o) => {
      if (!search) return o.language === lang;
      return o.language === lang && o.owasp !== o.title && (
        o.title.toUpperCase().match(search.toUpperCase()) || 
        o.description.toUpperCase().match(search.toUpperCase()) || 
        o.consequences.toUpperCase().match(search.toUpperCase()) || 
        o.recommendations.toUpperCase().match(search.toUpperCase()) 
      );
    }), [
      (o) => parseInt(o.owasp.replace(/^A([0-9]+):.*$/i, '$1')),
      (o) => o.title
    ]);
  }

  handleSearchChange = (e, { name, value }) => {
    const { data, lang, search } = { ...this.state, [name]: value };
    this.setState({ loading: true });
    const templates = this.filter(data, lang, search);
    this.setState({ loading: false, templates: templates, [name]: value });
    this.props.history.push(`/home/${lang}/${encodeURIComponent(search)}/`);
  }

  handleSearchClear = () => {
    const { data, lang } = this.state;
    this.setState({ loading: true });
    const templates = this.filter(data, lang, '');
    this.setState({ loading: false, templates: templates, search: '' });
    this.props.history.push(`/home/${lang}//`);
  }

  handleTemplatePin = (uuid) => {
    const { refs, lang, search } = this.state;
    this.props.history.push(`/home/${lang}/${encodeURIComponent(search)}/${uuid}`);
    window.scrollTo({
      top: refs[uuid].current.offsetTop - 14,
      behavior: 'smooth'
    });
  }

  handleImportClick = (e) => {}

  render = () => {
    const { loading, data, templates, refs, total, search, lang } = this.state;

    return (
      <React.Fragment>
        <TplNavbar 
          data={data} 
          onImport={this.handleImportClick} 
          onUpdate={this.handleUpdate}
        />
        <Container className='wrapper'>
          <Ref innerRef={this.containerRef}>
            <Grid>
              <Grid.Column width={4}>
                <Sticky context={this.containerRef} offset={62.5666}>
                  <Dimmer active={loading} inverted></Dimmer>
                  <TplSearchInput 
                    search={search} 
                    lang={lang} 
                    onChange={this.handleSearchChange} 
                    onClear={this.handleSearchClear} 
                  />
                  <TplSidebarMenu 
                    templates={templates} 
                    total={total} 
                    onClick={this.handleTemplatePin} 
                    key={`Sidebar-${lang}-${search}`}
                  />
                </Sticky>
              </Grid.Column>
              <Grid.Column width={12}>
                <Dimmer active={loading} inverted>
                  <Loader />
                </Dimmer>
                <TplList 
                  templates={templates} 
                  refs={refs} 
                  search={search} 
                  onPin={this.handleTemplatePin}
                  onUpdate={this.handleUpdate}
                />
                <TplFooter />
              </Grid.Column>
            </Grid>
          </Ref>
        </Container>
      </React.Fragment>
    );
  }
}

/*****************************************************************************
 * TplList
 *****************************************************************************/
 
const TplList = (props) => {
  const { templates, refs, search, onPin, onEdit, onUpdate } = props;

  const TplListItem = ({ tpl, refs }) => (
    <Ref innerRef={refs[tpl.uuid]}>
      <Segment
        key={tpl.uuid} 
        ref={refs[tpl.uuid]} 
        size='mini' 
        secondary={tpl.owasp === tpl.title}
      >
        <TplListHeader 
          tpl={tpl} 
          onPin={onPin} 
          onEdit={onEdit} 
          onUpdate={onUpdate} 
        />
        <TplListContent md={tpl.description} />
        <TplListContent md={tpl.consequences} />
        <TplListContent md={tpl.recommendations} />
      </Segment>
    </Ref>
  );

  const TplListHeader= ({ tpl, onPin, onEdit, onUpdate }) => {    
    return (
      <Header>
        {tpl.title}
        <TplItemModal
          uuid={tpl.uuid}
          trigger={<Label 
            as='a' 
            basic 
            size='mini' 
            content='Edit' 
            icon='edit outline' 
          />}
          onUpdate={onUpdate}
        />
        <Popup
          trigger={<Label 
            as='a' 
            basic 
            size='mini' 
            icon='pin' 
            empty 
            onClick={() => onPin(tpl.uuid)}
          />}
          size='mini' 
          content='Pin the template to share it'
          position='bottom right'
        />
        <Header.Subheader>
          {tpl.owasp}
        </Header.Subheader>
      </Header>
    );
  };

  const TplListContent = ({ md }) => {
    if (search) md = md.replace(new RegExp('(' + search + ')', 'i'), '||$1||');
    md += '\n' + _.join(_.map(md.match(/\b(([A-Z])\2\2)\b/g), (m) => {
      return '*[' + m + ']: need to be replaced';
    }), '\n');
    
    return (
      <p class='paragraph'>{
        unified()
          .use(remarkParse)
          .use(remarkAbbr)
          .use(remarkKbd)
          .use(remarkReact)
          .processSync(md).result
      }</p>
    );
  };

  return (
    <React.Fragment>
      { _.map(templates, (tpl) => (
        <TplListItem tpl={tpl} refs={refs} />
      )) }
    </React.Fragment>
  );
}

/*****************************************************************************
 * TplItemModal
 *****************************************************************************/

class TplItemModal extends React.Component {
  state = {}

  constructor(props) {
    super(props);
    this.state = {
      error: null,
      open: false,
      loading: true,
      uuid: props.uuid || null,
      template: {},
      trigger: props.trigger,
      onUpdate: props.onUpdate,
      topTenOwasp: _.map([
        'A1:2017 - Injection',
        'A2:2017 - Broken Authentication',
        'A3:2017 - Sensitive Data Exposure',
        'A4:2017 - XML External Entities (XXE)',
        'A5:2017 - Broken Access Control',
        'A6:2017 - Security Misconfiguration',
        'A7:2017 - Cross-Site Scripting (XSS)',
        'A8:2017 - Insecure Deserialization',
        'A9:2017 - Using Components with Known Vulnerabilities',
        'A10:2017 - Insufficient Logging &amp; Monitoring'
      ], (v) => { return { key: v, value: v, text: v }; })
    };
  }

  handleOpen = () => {
    const { uuid } = this.state;
    if (uuid) {
      fetch('/api/template/' + uuid)
        .then((response) => { 
          if (response.status < 400) return response.json(); 
          else throw new Error(); 
        })
        .then(({ status, data }) => this.setState({ 
          loading: false, 
          open: true, 
          template: data
        }))
        .catch((error) => this.setState({ 
          loading: false, 
          open: true, 
          error 
        }));
    } else {
      this.setState({ 
        loading: false, 
        open: true 
      });
    }
  }

  handleClose = () => {
    this.setState({ open: false });
  }

  handleChange = (e, {name, value}) => {
    this.setState(prevState => ({
      template: { ...prevState.template, [name]: value }
    }));
  }

  handleSave = () => {
    const { uuid, template, onUpdate } = this.state;
    console.log(this.state.template);
    this.setState({ open: false });

    const options = {
      method: uuid ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    };

    fetch(uuid ? '/api/template/' + uuid : '/api/template', options)
      .then((response) => { 
        if (response.status < 400) return response.json(); 
        else throw new Error(); 
      })
      .then(({ status, data }) => onUpdate(data))
      .catch((error) => this.setState({ 
        open: false 
      }));
  }

  render = () => {
    const { error, open, loading, uuid, 
      template, trigger, topTenOwasp } = this.state;

    return (
      <Modal closeIcon open={open}
        onClose={this.handleClose}
        onOpen={this.handleOpen}
        trigger={trigger}
      >
        <Modal.Header>
          <Icon name='file alternate outline' /> 
          VulnDB &ndash; {uuid ? 'Edit template' : 'Add template'}
        </Modal.Header>
        <Modal.Content>
          <Form size='small' loading={loading} error={error !== null} >
            <Message error>
              <Message.Header>Unable to load data</Message.Header>
              The data could not be loaded, either because the template does 
              not exist, or because the API is no longer available.
            </Message>
            <Form.Input 
              name='title'
              value={template.title} 
              placeholder='Title' 
              size='huge' 
              onChange={this.handleChange} 
              disabled={error !== null}
            />
            <Form.Group unstackable>
              <Form.Dropdown 
                name='owasp'
                value={template.owasp} 
                placeholder='OWASP Top 10' 
                selection search 
                options={topTenOwasp} 
                width={14} 
                onChange={this.handleChange} 
                disabled={error !== null}
              />
              <Form.Radio 
                label='FR' 
                name='language' 
                value='FR' 
                checked={template.language === 'FR'} 
                onChange={this.handleChange} 
                disabled={error !== null}
              />
              <Form.Radio 
                label='EN' 
                name='language' 
                value='EN' 
                checked={template.language === 'EN'} 
                onChange={this.handleChange} 
                disabled={error !== null}
              />
            </Form.Group>
            <Form.TextArea 
              label='Description' 
              name='description' 
              value={template.description} 
              rows={5} 
              onChange={this.handleChange} 
              disabled={error !== null}
            />
            <Form.TextArea 
              label='Consequences' 
              name='consequences' 
              value={template.consequences} 
              rows={5} 
              onChange={this.handleChange} 
              disabled={error !== null}
            />
            <Form.TextArea 
              label='Recommendations' 
              name='recommendations' 
              value={template.recommendations} 
              rows={5} 
              onChange={this.handleChange} 
              disabled={error !== null}
            />
            <Segment size='tiny' basic secondary textAlign='right'>
              The text boxes for the "Description", "Consequences" and 
              "Recommendation" paragraphs support Markdown syntax.
            </Segment>
          </Form>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={this.handleClose}>Close</Button>
          <Button primary 
            disabled={loading || error !== null} 
            onClick={this.handleSave}
          >
            <Icon name='save' /> Save
          </Button>
        </Modal.Actions>
      </Modal>
    );
  }
}

/*****************************************************************************
 * TplNavbar
 *****************************************************************************/

const TplNavbar = (props) => {
  const { data, onImport, onUpdate } = props;

  return (
    <Menu pointing secondary inverted size='huge' className='navbar'>
      <Container>
        <Menu.Item header><Link to='/'>VulnDB</Link></Menu.Item>
        <Menu.Menu icon position='right'>
          <Menu.Item href='/api/export' target='_blank'>
            <Icon name='download' />
          </Menu.Item>
          <Menu.Item onClick={onImport}>
            <Icon name='upload' />
          </Menu.Item>
          <TplItemStatistics 
            data={data} 
            trigger={<Menu.Item>
              <Icon name='line graph' />
            </Menu.Item>}
          />
          <TplItemModal
            trigger={<Menu.Item>
              <Icon name='add square' />
            </Menu.Item>}
            onUpdate={onUpdate}
          />
        </Menu.Menu>
      </Container>
    </Menu>
  );
}

/*****************************************************************************
 * TplItemStatistics
 *****************************************************************************/

const TplItemStatistics = (props) => {
  const { data, trigger } = props;
  const [ open, setOpen ] = React.useState(false);

  const dataChart = _.sortBy(_.reduce(data, (acc, tpl) => {
    if (! acc[tpl.owasp]) acc[tpl.owasp] = { name: tpl.owasp, total: 0 };
    if (! acc[tpl.owasp][tpl.language]) {
      acc[tpl.owasp][tpl.language] = 1;
    } else {
      acc[tpl.owasp][tpl.language] += 1;
    }
    acc[tpl.owasp].total += 1;
    return acc;
  }, {}), [
    (owasp) => parseInt(owasp.name.replace(/^A([0-9]+):.*$/i, '$1'))
  ]);

  return (
    <Modal closeIcon open={open}
      onClose={() => setOpen(false)}
      onOpen={() => setOpen(true)}
      trigger={trigger}
    >
      <Modal.Header>
        <Icon name='line graph' /> VulnDB &ndash; Statistics
      </Modal.Header>
      <Modal.Content>
        <BarChart width={858} height={200} data={dataChart} >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tickFormatter={(tick) => tick.replace(/^(A[0-9:]+).*$/i, '$1')} 
          />
          <YAxis />
          <Tooltip />
          <Bar dataKey="FR" fill="#17a2b8" />
          <Bar dataKey="EN" fill="#6c757d" />
        </BarChart>
        <Table compact='very'>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>&nbsp;</Table.HeaderCell>
              <Table.HeaderCell>FR</Table.HeaderCell>
              <Table.HeaderCell>EN</Table.HeaderCell>
              <Table.HeaderCell>Total</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            { _.map(dataChart, (owasp) => (
              <Table.Row>
                <Table.Cell>{owasp.name}</Table.Cell>
                <Table.Cell>{owasp.FR || 0}</Table.Cell>
                <Table.Cell>{owasp.EN || 0}</Table.Cell>
                <Table.Cell>{(owasp.total || 0)}</Table.Cell>
              </Table.Row>
            )) }
          </Table.Body>
          <Table.Footer>
            <Table.Row>
              <Table.HeaderCell>&nbsp;</Table.HeaderCell>
              <Table.HeaderCell>{_.sumBy(dataChart, 'FR')}</Table.HeaderCell>
              <Table.HeaderCell>{_.sumBy(dataChart, 'EN')}</Table.HeaderCell>
              <Table.HeaderCell>{_.sumBy(dataChart, 'total')}</Table.HeaderCell>
            </Table.Row>
          </Table.Footer>
        </Table>
      </Modal.Content>
      <Modal.Actions>
        <Button onClick={() => setOpen(false)}>Close</Button>
      </Modal.Actions>
    </Modal>
  );
}

/*****************************************************************************
 * TplSearchInput
 *****************************************************************************/

const TplSearchInput = (props) => {
  const { search, lang, onChange, onClear } = props;

  const options = [
    { key: 'FR', text: 'FR', value: 'FR' },
    { key: 'EN', text: 'EN', value: 'EN' },
  ];

  return (
    <Input 
      fluid 
      placeholder='Search...' 
      name='search'
      value={search}
      onChange={onChange}
      label={<Dropdown 
        basic 
        name='lang' 
        value={lang || 'FR'} 
        options={options} 
        onChange={onChange}
      />}
      labelPosition='left' 
      icon={<Icon 
        link 
        name='close' 
        disabled={!search} 
        onClick={onClear} 
      />} 
    />
  );
}

/*****************************************************************************
 * TplSidebarMenu
 *****************************************************************************/

const TplSidebarMenu = (props) => {
  const { templates, total, onClick } = props;

  const sidebar =  _(templates).sortBy([
    (o) => parseInt(o.owasp.replace(/^A([0-9]+):.*$/i, '$1')),
    (o) => o.title
  ]).reduce((menu, tpl) => {
    if (! menu[tpl.owasp]) {
      menu[tpl.owasp] = { 
        category: tpl.owasp, 
        templates: [] 
      };
    }
    if (tpl.owasp !== tpl.title) {
      menu[tpl.owasp].templates.push(tpl);
    }
    return menu;
  }, {});

  return (
    <Menu vertical>
      <Menu.Item>
        <Message size='mini'>
          {templates.length} / {total} templates shown
        </Message>
      </Menu.Item>
      { _.map(sidebar || [], (menu) => (
        <Menu.Item>
          <Menu.Header>{menu.category}</Menu.Header>
          <Menu.Menu>
            { _.map(menu.templates, (tpl) => (
              <Menu.Item
                key={tpl.uuid}
                name={tpl.title}
                onClick={() => onClick(tpl.uuid)}
              />
            )) }
          </Menu.Menu>
        </Menu.Item>
      )) }
    </Menu>
  );
}

/*****************************************************************************
 * TplFooter
 *****************************************************************************/

const TplFooter = (props) => {
  return (
    <List floated='right' horizontal size='mini'>
      <List.Item disabled href='#'>
        Templates for pentest reports &ndash; <em>Kraffted</em> with &lt;3
      </List.Item>
      <List.Item href='//github.com/vonKrafft/VulnDB-Docker' target='_blank'>
        <Icon name='github' /> Source code
      </List.Item>
      <List.Item disabled href='#'>
        v3.0.0
      </List.Item>
    </List>
  );
}